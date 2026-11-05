import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

from scripts import deploy


class DeployTests(unittest.TestCase):
    def test_manual_workflow_uses_requested_revision(self):
        config = yaml.load(Path(".github/workflows/deploy-pages.yml").read_text(), Loader=yaml.BaseLoader)
        self.assertEqual(set(config["on"]), {"workflow_dispatch"})
        self.assertIn("revision", config["on"]["workflow_dispatch"]["inputs"])
        checkout = config["jobs"]["build"]["steps"][0]
        self.assertEqual(checkout["with"]["ref"], "${{ inputs.revision || github.sha }}")

    def test_dispatches_exact_pushed_revision_without_git_mutation(self):
        revision = "a" * 40
        with patch.object(deploy, "git_output", side_effect=["main", "", revision, f"{revision}\trefs/heads/main"]), patch.object(
            deploy.subprocess, "run"
        ) as run:
            deploy.main()
        self.assertEqual(run.call_count, 1)
        self.assertEqual(run.call_args.args[0], [
            "gh", "workflow", "run", "deploy-pages.yml", "--ref", "main", "-f", f"revision={revision}"
        ])

    def test_rejects_wrong_branch_dirty_tree_and_unpushed_revision(self):
        for outputs in (["feature"], ["main", " M file"], ["main", "", "a" * 40, "b" * 40]):
            with self.subTest(outputs=outputs), patch.object(deploy, "git_output", side_effect=outputs), patch.object(
                deploy.subprocess, "run"
            ) as run:
                with self.assertRaises(SystemExit):
                    deploy.main()
                run.assert_not_called()

    def test_git_errors_are_not_treated_as_clean(self):
        with patch.object(deploy.subprocess, "run", side_effect=subprocess.CalledProcessError(128, "git")):
            with self.assertRaises(subprocess.CalledProcessError):
                deploy.git_output("status", "--porcelain")
