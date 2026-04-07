import os

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from pathlib import Path
import time
import json
from typing import Any
import toml
import logging
import argparse
from collections import defaultdict
from dotenv import load_dotenv
from enum import Enum

import numpy as np
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.optim as opt
from torch.utils.data import DataLoader
from torch.amp import autocast, GradScaler
from torch.utils.tensorboard import SummaryWriter
from torch.optim.lr_scheduler import CosineAnnealingLR
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator

from class_config import ClassInfo, ClassInfoFactory
from dataset import create_train_val_sets, TrainType
from SAM2UNet import SAM2UNet, ModelSize, InputResolution
from dataclasses import dataclass
from typing import Optional

load_dotenv()  # Load environment variables from .env file

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

TIMESTAMP_FORMAT = "%Y-%m-%d_%H-%M-%S"


@dataclass
class TrainArgs:
    """Arguments for training."""

    comment: str
    model_size: ModelSize
    dataset_path: Optional[Path]
    runs_path: Optional[Path]
    checkpoint_path: Optional[Path]
    continue_run: Optional[Path]
    epoch: int
    lr: float
    batch_size: int
    weight_decay: float
    eval_only: bool
    reduce_ratio: Optional[float]
    classes: str
    checkpoint_freq: int
    resolution: InputResolution
    train_backbone: bool
    refine: bool
    multiply_train_set: int
    use_coco_bg: bool
    train_scanbodies: bool
    use_class_weights: bool
    train_type: TrainType
    run_name: Optional[str] = None
    run_profile: str = "debug"
    run_path: None | Path = None


def serialize_value(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): serialize_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


def write_run_manifest(args: TrainArgs, run_name: str) -> None:
    if args.run_path is None:
        raise ValueError("run_path must be set before writing run metadata.")

    manifest = {
        "run_name": run_name,
        "run_profile": args.run_profile,
        "args": {key: serialize_value(value) for key, value in vars(args).items()},
    }

    split_path = Path("dataset_info/train_val_split.toml")
    if split_path.exists():
        with open(split_path, "r", encoding="utf-8") as f:
            manifest["train_val_split"] = toml.load(f)

    with open(args.run_path / "run_config.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def main(args: TrainArgs):
    """Main training function."""
    # Setup
    writer, run_name, start_epoch = setup_run_directory(args)
    checkpoint = load_checkpoint(args)
    class_info: ClassInfo = load_class_info(args)
    model, optim, scheduler, scaler, device = setup_model_and_optimizers(args, checkpoint, class_info)
    train_loader, val_loader = load_dataset_and_classes(args, class_info)

    # Training loop
    logging.info("Starting training for %d epochs...", args.epoch)
    for epoch in range(start_epoch, args.epoch):
        # Train
        if not args.eval_only:
            epoch_train_losses = train_epoch(model, train_loader, optim, scaler, writer, epoch, class_info, device)

        # Validate
        epoch_val_losses = validate_epoch(model, val_loader, writer, epoch, class_info, device)

        if args.eval_only:
            break

        # Post epoch tasks
        scheduler.step()
        writer.add_scalar("Train Loss/Epoch", np.mean(epoch_train_losses), epoch)
        writer.add_scalar("Val Loss/Epoch", np.mean(epoch_val_losses), epoch)
        writer.add_scalar("Learning Rate", optim.param_groups[0]["lr"], epoch)

        # Save checkpoint
        if epoch % args.checkpoint_freq == 0 or epoch == args.epoch - 1:
            save_checkpoint(model, optim, scheduler, scaler, epoch, run_name, args)

    # Cleanup
    writer.close()
    logging.info("Training complete.")


def setup_run_directory(args: TrainArgs):
    """Setup run directory and tensorboard writer."""
    # Handle continuing existing runs
    if args.continue_run:

        if args.continue_run.suffix == ".pth":
            # If a checkpoint is provided, use its directory as the run path
            args.run_path = args.continue_run.parent
            args.checkpoint_path = args.continue_run
        else:
            args.run_path = args.continue_run

        run_name = args.run_path.name
        logging.info("Continuing training from: %s", args.run_path)

        # Find the latest checkpoint to resume from
        if args.checkpoint_path is None:
            checkpoints = [f for f in args.run_path.iterdir() if f.suffix == ".pth"]
            if checkpoints:
                checkpoints.sort(key=lambda x: int(x.stem.split("-")[-1]))
                args.checkpoint_path = checkpoints[-1]
                logging.info("Auto-selected checkpoint: %s", args.checkpoint_path)

        # Extract starting epoch from checkpoint filename
        event_acc = EventAccumulator(args.run_path)
        event_acc.Reload()
        start_epoch = event_acc.Scalars("mIoU")[-1].step + 1
        logging.info("Starting from epoch: %d", start_epoch)
    else:
        # Create new run directory
        timestamp = time.strftime(TIMESTAMP_FORMAT, time.localtime())
        run_name = args.run_name or timestamp
        if args.runs_path is None:
            raise ValueError("runs_path must be provided when not continuing a run")
        if args.comment and args.run_name is None:
            run_name += f"_{args.comment}"
        args.run_path = args.runs_path / run_name
        args.run_path.mkdir(parents=True, exist_ok=True)
        start_epoch = 0

    write_run_manifest(args, run_name)
    writer = SummaryWriter(log_dir=args.run_path)
    return writer, run_name, start_epoch


def load_class_info(args: TrainArgs) -> ClassInfo:
    """Load typed class information for the requested configuration."""
    if args.classes is None:
        raise ValueError("Classes must be specified with --classes argument.")
    class_info = ClassInfoFactory.load(args.classes)

    if args.use_class_weights:
        weights_path = ClassInfoFactory.weights_path(args.classes)
        with open(weights_path, "r", encoding="utf-8") as f:
            weights = toml.load(f)["weights"]
        class_info = class_info.with_weights(weights)

    return class_info


def load_dataset_and_classes(args: TrainArgs, class_info: ClassInfo):
    """Load dataset and class information."""
    if args.dataset_path is None:
        raise ValueError("dataset_path must be provided with --dataset_path argument.")

    height, width = args.resolution.dimensions()
    train_set, val_set = create_train_val_sets(
        Path(args.dataset_path),
        height,
        width,
        class_info,
        reduce_ratio=args.reduce_ratio,
        multiply_train=args.multiply_train_set,
        use_coco_bg=args.use_coco_bg,
        train_scanbodies=args.train_scanbodies,
        train_type=args.train_type,
    )

    train_loader = DataLoader(
        train_set,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=8,
        drop_last=True,
        persistent_workers=True,
    )
    val_loader = DataLoader(
        val_set,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=8,
        drop_last=False,
        persistent_workers=True,
    )

    logging.info("Train type: %s", args.train_type.value)
    logging.info("Train set size: %d (%d batches)", len(train_set), int(len(train_set) / args.batch_size))
    logging.info("Val   set size: %d (%d batches)", len(val_set), int(len(val_set) / args.batch_size))

    return train_loader, val_loader


def load_checkpoint(args: TrainArgs) -> Any | None:
    if args.checkpoint_path is not None:
        logging.info("Loading checkpoint from: %s", args.checkpoint_path)
        checkpoint = torch.load(args.checkpoint_path, weights_only=False)

        # Extract parameters that are bound by the checkpoint
        args.model_size = checkpoint["model_size"]

        # Overwrite all parameters when continuing a run
        if hasattr(args, "continue_run") and args.continue_run:
            for key, value in checkpoint["args"].items():
                setattr(args, key, value)

        if isinstance(args.model_size, str):
            args.model_size = ModelSize(args.model_size)

        if isinstance(args.resolution, str):
            args.resolution = InputResolution(args.resolution)

        return checkpoint
    else:
        logging.info("No checkpoint provided, starting a new run.")
        return None


def setup_model_and_optimizers(args: TrainArgs, checkpoint, class_info: ClassInfo):
    """Initialize model, optimizer, scheduler, and scaler."""
    device = torch.device("cuda")

    model = SAM2UNet(class_info.num_classes(), model_size=args.model_size, normalize_input=False)

    # Load checkpoint if provided
    if checkpoint is not None:
        model.load_state_dict(checkpoint["model_state_dict"])

    model.to(device)

    optim = opt.AdamW(
        [{"params": model.parameters(), "initial_lr": args.lr}],
        lr=args.lr,
        weight_decay=args.weight_decay,
    )
    scheduler = CosineAnnealingLR(optim, args.epoch, eta_min=1.0e-7)
    scaler = GradScaler()

    # Load optimizer and scheduler states if available from checkpoint if continuing a run
    if hasattr(args, "continue_run") and args.continue_run:
        if "optimizer_state_dict" in checkpoint:
            optim.load_state_dict(checkpoint["optimizer_state_dict"])
        if "scheduler_state_dict" in checkpoint:
            scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
        if "scaler_state_dict" in checkpoint:
            scaler.load_state_dict(checkpoint["scaler_state_dict"])

    return model, optim, scheduler, scaler, device


def train_epoch(
    model: SAM2UNet,
    train_loader: DataLoader,
    optim: torch.optim.Optimizer,
    scaler: GradScaler,
    writer: SummaryWriter,
    epoch: int,
    class_info: ClassInfo,
    device: torch.device,
) -> list[float]:
    """Train the model for one epoch."""
    model.train()
    epoch_train_losses: list[float] = []

    for i, batch in enumerate(tqdm(train_loader, desc=f"Training Epoch {epoch}")):
        x, target = batch["image"].to(device), batch["label"].to(device)
        optim.zero_grad()

        with autocast(device_type="cuda"):
            predictions = model(x)
            loss = calculate_loss(
                predictions,
                target,
                class_info,
                use_class_weights=class_info.use_class_weights,
            )

        scaler.scale(loss).backward()
        scaler.step(optim)
        scaler.update()

        writer.add_scalar("Train Loss/Batch", loss.item(), epoch * len(train_loader) + i)
        epoch_train_losses.append(loss.item())

    return epoch_train_losses


def validate_epoch(
    model: SAM2UNet,
    val_loader: DataLoader,
    writer: SummaryWriter,
    epoch: int,
    class_info: ClassInfo,
    device: torch.device,
) -> list[float]:
    """Validate the model for one epoch."""
    model.eval()
    epoch_val_losses: list[float] = []
    metrics = initialize_metrics(class_info)

    for i, batch in enumerate(tqdm(val_loader, desc=f"Validate Epoch {epoch}")):
        x, target = batch["image"].to(device), batch["label"].to(device)

        with torch.no_grad():
            with autocast(device_type="cuda"):
                predictions = model(x)
                loss = calculate_loss(predictions, target, class_info)

        writer.add_scalar("Val Loss/Batch", loss.item(), epoch * len(val_loader) + i)
        epoch_val_losses.append(loss.item())
        metrics = calculate_metrics(predictions[3], target, metrics, class_info)

    write_metrics(writer, metrics, epoch)
    return epoch_val_losses


def save_checkpoint(model, optim, scheduler, scaler, epoch, run_name, args: TrainArgs):
    if args.run_path is None:
        raise ValueError("run_path must be set to save checkpoints.")

    checkpoint = {
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optim.state_dict(),
        "scheduler_state_dict": scheduler.state_dict(),
        "scaler_state_dict": scaler.state_dict(),
        "epoch": epoch + 1,
        "model_size": model.model_size,
        "model_config": {
            "normalize_input": model.normalize_input,
        },
        "run_name": run_name,
        "args": {key: serialize_value(value) for key, value in vars(args).items()},
    }
    checkpoint_path = args.run_path / f"{run_name}-{epoch + 1}.pth"
    torch.save(checkpoint, checkpoint_path)
    logging.info("Checkpoint saved")

    # Save ONNX model if at last epoch
    if epoch == args.epoch - 1:
        logging.info("Exporting model to ONNX format: %s", checkpoint_path.with_suffix(".onnx"))
        args.checkpoint_path = checkpoint_path
        from scripts.export_onnx import ExportOnnxArgs, main as export_onnx

        export_onnx(
            ExportOnnxArgs(
                classes=args.classes,
                model_size=args.model_size.value,
                checkpoint_path=checkpoint_path,
            )
        )


def calculate_loss(
    predictions: torch.Tensor,
    target: torch.Tensor,
    class_info: ClassInfo,
    fp_penalty_weight=4.0,
    use_class_weights=False,
) -> torch.Tensor:
    """Calculate combined loss from multiple predictions (3D tensors)."""
    # Combining losses from multiple outputs helps the model
    # learn robust, multi-scale features and improves training dynamics.

    # Ensure predictions and target are 3D tensors

    # Cross-Entropy Loss
    if use_class_weights:
        if not class_info.weights:
            raise ValueError("Class weights requested but not provided in class info.")
        weight_tensor = torch.tensor(class_info.weights).to(predictions[0].device)
        loss0 = nn.CrossEntropyLoss(weight=weight_tensor)(predictions[0], target)
        loss1 = nn.CrossEntropyLoss(weight=weight_tensor)(predictions[1], target)
        loss2 = nn.CrossEntropyLoss(weight=weight_tensor)(predictions[2], target)
    else:
        loss0 = nn.CrossEntropyLoss()(predictions[0], target)
        loss1 = nn.CrossEntropyLoss()(predictions[1], target)
        loss2 = nn.CrossEntropyLoss()(predictions[2], target)
    base_loss = loss0 + loss1 + loss2

    return base_loss


def initialize_metrics(class_info: ClassInfo) -> dict[str, list[float]]:
    """Initialize metrics dictionary."""
    metrics: dict[str, list[float]] = defaultdict(list)
    metrics["loss"] = []
    metrics["mPA"] = []
    for target_class in class_info.target_classes.keys():
        metrics[f"IoU {target_class.value}"] = []
    metrics["mIoU"] = []
    return metrics


def calculate_metrics(
    pred: torch.Tensor,
    target: torch.Tensor,
    metrics: dict[str, list[float]],
    class_info: ClassInfo,
) -> dict[str, list[float]]:
    """Calculate IoU metrics for each class."""
    # pred = pred[:, 0, :, :]

    # Calculate IoU for each class
    for target_class, class_idx in class_info.target_classes.items():
        pred_mask = (pred == class_idx).float()
        target_mask = (target == class_idx).float()
        if target_mask.sum() == 0:
            metrics[f"IoU {target_class.value}"].append(np.nan)
            continue
        intersection = (pred_mask * target_mask).sum()
        union = ((pred_mask + target_mask) > 0).sum()
        iou = intersection / (union + 1e-8)
        metrics[f"IoU {target_class.value}"].append(iou.item())

    return metrics


def write_metrics(
    writer: torch.utils.tensorboard.SummaryWriter,
    metrics: dict[str, list[float]],
    epoch: int,
) -> None:
    """Write metrics to tensorboard."""
    mIoU = 0.0
    iou_count = 0
    for key, value in metrics.items():
        if key.startswith("IoU ") and np.isfinite(np.nanmean(value)):
            writer.add_scalar(key, np.nanmean(value), epoch)
            mIoU += float(np.nanmean(value))
            iou_count += 1

    if iou_count > 0:
        mIoU /= iou_count

    writer.add_scalar("mIoU", mIoU, epoch)


if __name__ == "__main__":
    parser = argparse.ArgumentParser("SAM2-UNet")
    parser.add_argument(
        "--comment",
        type=str,
        default="",
        help="comment for the run, will be added to the run name",
    )
    parser.add_argument(
        "--model_size",
        type=str,
        default=ModelSize.TINY.value,
        choices=ModelSize.values(),
        help="SAM2 hiera backbone model size",
    )
    parser.add_argument(
        "--dataset_path",
        type=str,
        required=False,
        default=os.getenv("DATASET_PATH"),
        help="path to the dataset top-level folder containing " "'images' and 'annotations' subfolders",
    )
    parser.add_argument(
        "--runs_path",
        type=str,
        required=False,
        default=os.getenv("RUNS_PATH"),
        help="path to the top-level run folder. subfolders will" "be created for each run based on the run name",
    )
    parser.add_argument(
        "--run_name",
        type=str,
        default=None,
        help="explicit run directory name. Useful for standardized tracked runs.",
    )
    parser.add_argument(
        "--run_profile",
        type=str,
        default="debug",
        choices=["debug", "standardized"],
        help="tag the run as debug or standardized for metadata and artifact routing.",
    )
    parser.add_argument(
        "--checkpoint_path",
        type=str,
        required=False,
        default=None,
        help="path to a previous checkpoint to continue training from",
    )
    parser.add_argument(
        "--continue_run",
        type=str,
        required=False,
        help="Can be a path to a previous run folder or a checkpoint file."
        "If set, the training will continue from the last epoch of the"
        "specified run, or from the specified checkpoint file.",
    )
    parser.add_argument("--epoch", type=int, default=100, help="training epochs")
    parser.add_argument("--lr", type=float, default=0.0001, help="learning rate")
    parser.add_argument(
        "--batch_size",
        default=32,
        type=int,
        help="use maximum batch size that fits into GPU memory",
    )
    parser.add_argument("--weight_decay", default=5e-4, type=float)
    parser.add_argument(
        "--eval_only",
        action="store_true",
        required=False,
        help="if set, only evaluate the model without training." "Useful to check the performance of previous checkpoints.",
    )
    parser.add_argument(
        "--reduce_ratio",
        type=float,
        default=None,
        help="if set, reduce the dataset by this ratio, useful for debugging",
    )
    parser.add_argument(
        "--classes",
        type=str,
        required=False,
        default="5",
        choices=ClassInfoFactory.available_keys(),
        help="name of the class toml file, e.g. '4'",
    )
    parser.add_argument(
        "--checkpoint_freq",
        type=int,
        default=10,
        help="frequency of saving checkpoints, in epochs",
    )
    parser.add_argument(
        "--resolution",
        type=str,
        default=InputResolution.SMALL.value,
        choices=InputResolution.values(),
        help="input resolution (<height>x<width>), choose between 192x224 (small) and 384x480 (large)",
    )
    parser.add_argument(
        "--train_backbone",
        action="store_true",
        required=False,
        help="if set, train the backbone of the model, otherwise freeze it.",
    )
    parser.add_argument(
        "--refine",
        action="store_true",
        required=False,
        help="if set, reduce the learning rate by half for fine-tuning.",
    )
    parser.add_argument(
        "--multiply_train_set",
        type=int,
        default=1,
        help="multiply the training set size by duplication."
        "Improves efficiency due to less dataset switching overhead."
        "Useful when the dataset is small.",
    )
    parser.add_argument(
        "--use_coco_bg",
        action="store_true",
        required=False,
        help="if set, use COCO background replacement augmentation.",
    )
    parser.add_argument(
        "--train_scanbodies",
        action="store_true",
        required=False,
        help="if set, use scanbody augmentation. places scanbodies randomly in the image.",
    )
    parser.add_argument(
        "--use_class_weights",
        action="store_true",
        default=False,
        help="if set, use class weights in the loss function to handle class imbalance."
        "weights are read from 'classes/<classes>_weights.toml'. this has not been found to be very useful so far.",
    )
    parser.add_argument(
        "--train_type",
        type=str,
        default=TrainType.BOTH.value,
        choices=[t.value for t in TrainType],
        help="which image type to train on: 'rgb', 'ambient', or 'both'",
    )
    args_ = parser.parse_args()

    # Convert path arguments to pathlib.Path objects
    if args_.dataset_path:
        args_.dataset_path = Path(args_.dataset_path)
    if args_.runs_path:
        args_.runs_path = Path(args_.runs_path)
    if args_.checkpoint_path:
        args_.checkpoint_path = Path(args_.checkpoint_path)
    if args_.continue_run:
        args_.continue_run = Path(args_.continue_run)

    args_.resolution = InputResolution(args_.resolution)
    args_.model_size = ModelSize(args_.model_size)
    args_.train_type = TrainType(args_.train_type)

    # Batch size is set to the maximum that fits into 24GB GPU memory
    # Learning rate is adjusted based on batch size
    match args_.model_size:
        case ModelSize.TINY:
            args_.batch_size = 128
            args_.lr = 0.001
        case ModelSize.SMALL:
            args_.batch_size = 128
            args_.lr = 0.001
        case ModelSize.BASE_PLUS:
            args_.batch_size = 96
            args_.lr = 0.0005

        case ModelSize.LARGE:
            args_.batch_size = 64
            args_.lr = 0.0001

    if args_.resolution == InputResolution.LARGE:
        args_.batch_size = args_.batch_size // 4
        args_.lr = args_.lr / 2  # 0.25x reduction would probably be too much

    if args_.refine:
        args_.lr = args_.lr / 2

    logging.info("Using batch size: %d, learning rate: %.6f", args_.batch_size, args_.lr)

    main(TrainArgs(**vars(args_)))
