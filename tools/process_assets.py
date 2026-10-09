import sys
import os
import cv2
import numpy as np

def process_sheet(image_path, output_dir, cols, rows, target_size, padding_pct=0.08):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Failed to load image: {image_path}")
        return

    # Add alpha channel if missing
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    h, w = img.shape[:2]
    cell_w = w // cols
    cell_h = h // rows

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            
            x1, y1 = c * cell_w, r * cell_h
            x2, y2 = x1 + cell_w, y1 + cell_h
            
            cell = img[y1:y2, x1:x2].copy()
            
            # Flood fill from edges to remove white background
            # We use a mask for floodFill
            h_c, w_c = cell.shape[:2]
            mask = np.zeros((h_c + 2, w_c + 2), np.uint8)
            
            # Tolerance for white
            lo_diff = (10, 10, 10, 10)
            up_diff = (10, 10, 10, 10)
            
            # We want to change the alpha to 0. Let's create a BGR copy for floodFill.
            flood_img_bgr = cell[:, :, :3].copy()
            for x, y in [(0, 0), (w_c-1, 0), (0, h_c-1), (w_c-1, h_c-1), (w_c//2, 0), (0, h_c//2), (w_c-1, h_c//2), (w_c//2, h_c-1)]:
                # Only floodfill if the edge pixel is white-ish
                b, g, r_ch = flood_img_bgr[y, x]
                if b > 240 and g > 240 and r_ch > 240:
                    cv2.floodFill(flood_img_bgr, mask, (x, y), (255, 255, 255), lo_diff, up_diff, flags=4 | (255 << 8) | cv2.FLOODFILL_FIXED_RANGE)

            # Apply transparency
            # The mask returned by floodfill has 255 where it filled
            # We set alpha = 0 where mask == 255
            # mask is larger by 2 pixels
            fill_mask = mask[1:-1, 1:-1]
            cell[fill_mask == 255] = [255, 255, 255, 0]

            # We also set any remaining very white pixels to transparent as a fallback
            # but usually floodfill is enough.

            # Find bounding box of non-transparent pixels
            alpha_channel = cell[:, :, 3]
            coords = cv2.findNonZero(alpha_channel)
            
            if coords is not None:
                x, y, bw, bh = cv2.boundingRect(coords)
                # Crop to bounding box
                cropped = cell[y:y+bh, x:x+bw]
                
                # Calculate padding
                max_dim = max(bw, bh)
                pad = int(max_dim * padding_pct)
                padded_size = max_dim + 2 * pad
                
                # Center in square
                square = np.zeros((padded_size, padded_size, 4), dtype=np.uint8)
                
                start_y = (padded_size - bh) // 2
                start_x = (padded_size - bw) // 2
                
                square[start_y:start_y+bh, start_x:start_x+bw] = cropped
                
                # Resize to target size
                final_img = cv2.resize(square, (target_size, target_size), interpolation=cv2.INTER_AREA)
            else:
                # Empty cell
                final_img = np.zeros((target_size, target_size, 4), dtype=np.uint8)

            out_path = os.path.join(output_dir, f"{idx:02d}.png")
            cv2.imwrite(out_path, final_img)
            print(f"Saved {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python process_assets.py <image_path> <output_dir> <cols> <rows> <target_size> [padding_pct]")
        sys.exit(1)
        
    img_path = sys.argv[1]
    out_dir = sys.argv[2]
    c = int(sys.argv[3])
    r = int(sys.argv[4])
    t_size = int(sys.argv[5])
    p_pct = float(sys.argv[6]) if len(sys.argv) > 6 else 0.08
    
    process_sheet(img_path, out_dir, c, r, t_size, p_pct)
