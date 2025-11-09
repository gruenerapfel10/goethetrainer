#!/usr/bin/env python3
import os
import glob

# Base directory
base_dir = "/Users/green/Desktop/Developer/goethe/pdfs"

# For each folder (B1, B2, C1, C2)
for folder in ["B1", "B2", "C1", "C2"]:
    folder_path = os.path.join(base_dir, folder)
    png_dir = os.path.join(folder_path, "pngs")
    transcript_file = os.path.join(folder_path, "FULL_TRANSCRIPT.md")
    
    # Get all PNG files sorted
    png_files = sorted(glob.glob(os.path.join(png_dir, "*.png")), 
                      key=lambda x: int(x.split("_page_")[1].split(".")[0]))
    
    print(f"{folder}: {len(png_files)} pages found")
    print(f"Creating transcript file: {transcript_file}")
    
    # Initialize transcript with header
    with open(transcript_file, 'w') as f:
        f.write(f"# {folder} PDF Transcript\n\n")
        f.write(f"Total pages: {len(png_files)}\n\n")
        f.write("This transcript contains OCR text from all PNG images in this folder.\n\n")
        
        # Add placeholders for all pages
        for i, png_file in enumerate(png_files):
            page_num = i + 1
            f.write(f"---\n\n# Page {page_num}\n\n[Content to be added from {os.path.basename(png_file)}]\n\n")
    
    print(f"✓ Initialized {folder} transcript\n")

print("All transcripts initialized!")
