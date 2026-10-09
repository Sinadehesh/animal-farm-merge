import os
import sys
from PIL import Image, ImageDraw

def create_contact_sheet(img_dir, out_path):
    # Board colors
    wood = (165, 104, 61)  # #A5683D
    grass = (140, 207, 94) # #8CCF5E
    water = (79, 179, 232) # #4FB3E8
    
    files = sorted([f for f in os.listdir(img_dir) if f.endswith('.png')])
    
    # We will make 3 columns for each size.
    # Actually, a single background with 3 horizontal stripes might be easier,
    # or just make the background of each cell 3 stripes.
    
    # Let's make each cell have a background of 3 vertical stripes.
    # For 256px grid: 4 columns x 3 rows
    # For 64px grid: 4 columns x 3 rows
    
    # 256 grid
    cell_w = 256
    cell_h = 256
    pad = 10
    
    w_256 = 4 * cell_w + 5 * pad
    h_256 = 3 * cell_h + 4 * pad
    
    # 64 grid
    cell_w_64 = 64
    cell_h_64 = 64
    pad_64 = 5
    
    w_64 = 4 * cell_w_64 + 5 * pad_64
    h_64 = 3 * cell_h_64 + 4 * pad_64
    
    total_w = max(w_256, w_64)
    total_h = h_256 + h_64 + 20
    
    out_img = Image.new('RGBA', (total_w, total_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(out_img)
    
    def draw_striped_bg(x, y, cw, ch):
        # 3 horizontal stripes
        h_third = ch // 3
        draw.rectangle([x, y, x+cw, y+h_third], fill=wood)
        draw.rectangle([x, y+h_third, x+cw, y+2*h_third], fill=grass)
        draw.rectangle([x, y+2*h_third, x+cw, y+ch], fill=water)

    # Draw 256 grid
    for idx, f in enumerate(files):
        r = idx // 4
        c = idx % 4
        
        x = pad + c * (cell_w + pad)
        y = pad + r * (cell_h + pad)
        
        draw_striped_bg(x, y, cell_w, cell_h)
        
        img = Image.open(os.path.join(img_dir, f)).convert("RGBA")
        img = img.resize((cell_w, cell_h), Image.LANCZOS)
        
        out_img.paste(img, (x, y), img)

    # Draw 64 grid
    start_y = h_256 + 20
    for idx, f in enumerate(files):
        r = idx // 4
        c = idx % 4
        
        x = pad_64 + c * (cell_w_64 + pad_64)
        y = start_y + pad_64 + r * (cell_h_64 + pad_64)
        
        draw_striped_bg(x, y, cell_w_64, cell_h_64)
        
        img = Image.open(os.path.join(img_dir, f)).convert("RGBA")
        img = img.resize((cell_w_64, cell_h_64), Image.LANCZOS)
        
        out_img.paste(img, (x, y), img)
        
    out_img.save(out_path)

if __name__ == '__main__':
    create_contact_sheet(sys.argv[1], sys.argv[2])
