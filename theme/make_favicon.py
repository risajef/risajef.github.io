from PIL import Image

def png_to_ico(input_png, output_ico="favicon.ico"):
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    img = Image.open(input_png)
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    # Resize to all favicon sizes
    imgs = [img.resize(size, Image.LANCZOS) for size in sizes]
    imgs[0].save(output_ico, format='ICO', sizes=[im.size for im in imgs])
    print(f"ICO favicon created as {output_ico}")

if __name__ == "__main__":
    png_to_ico("output.png", "favicon.ico")