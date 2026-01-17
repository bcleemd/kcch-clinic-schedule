import os

def generate_gallery():
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    images = []
    
    # Scan for images
    for filename in sorted(os.listdir('.')):
        if os.path.isfile(filename):
            ext = os.path.splitext(filename)[1].lower()
            if ext in image_extensions:
                images.append(filename)
    
    html_content = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Gallery</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f0f0f0;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .gallery-container {
            max-width: 800px;
            width: 100%;
            background-color: white;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .image-item {
            margin-bottom: 30px;
            text-align: center;
        }
        .image-item img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-title {
            margin-top: 10px;
            color: #333;
            font-size: 1.1em;
        }
        h1 {
            text-align: center;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="gallery-container">
        <h1>Image Gallery</h1>
"""

    for img in images:
        html_content += f"""        <div class="image-item">
            <img src="{img}" alt="{img}" loading="lazy">
            <div class="image-title">{img}</div>
        </div>
"""

    html_content += """    </div>
</body>
</html>"""

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Gallery generated with {len(images)} images.")

if __name__ == "__main__":
    generate_gallery()
