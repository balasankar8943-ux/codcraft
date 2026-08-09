# scratch/optimize_favicon.py
from PIL import Image
import os

def optimize():
    target_png = 'public/favicon.png'
    target_ico = 'public/favicon.ico'
    root_png = 'favicon.png'
    
    if os.path.exists(target_png):
        img = Image.open(target_png)
        
        # Resize to standard high-res favicon size 192x192 and save optimized PNG
        img_resized = img.resize((192, 192), Image.Resampling.LANCZOS)
        img_resized.save(target_png, 'PNG', optimize=True)
        img_resized.save(root_png, 'PNG', optimize=True)
        
        # Save as multi-resolution ICO for maximum browser compatibility
        img.save(target_ico, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
        
        size_png_kb = os.path.getsize(target_png) / 1024.0
        size_ico_kb = os.path.getsize(target_ico) / 1024.0
        
        print(f"Success! Optimized PNG: {size_png_kb:.2f} KB, ICO: {size_ico_kb:.2f} KB")
    else:
        print("Error: public/favicon.png not found.")

optimize()
