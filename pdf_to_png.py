#!/usr/bin/env python3
"""
Convert PDF files to PNG images and organize them in subfolders.
"""

import os
import sys
from pathlib import Path
from pdf2image import convert_from_path

def pdf_to_png(pdf_path, output_dir):
    """
    Convert a PDF file to a series of PNG images.

    Args:
        pdf_path (str): Path to the PDF file
        output_dir (str): Directory to save PNG images
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Get the PDF filename without extension
    pdf_name = Path(pdf_path).stem

    print(f"Converting {pdf_path}...")

    try:
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=150)

        # Save each page as PNG
        for i, image in enumerate(images, 1):
            output_path = os.path.join(output_dir, f"{pdf_name}_page_{i}.png")
            image.save(output_path, 'PNG')
            print(f"  Saved: {output_path}")

        print(f"Successfully converted {pdf_path} to {len(images)} PNG(s)\n")

    except Exception as e:
        print(f"Error converting {pdf_path}: {e}\n")

def main():
    """Main function to process all PDFs in subfolders."""
    # Base directory containing PDF subfolders
    base_dir = "/Users/green/Desktop/Developer/goethe/pdfs"

    if not os.path.exists(base_dir):
        print(f"Error: Base directory {base_dir} does not exist")
        sys.exit(1)

    # Iterate through each subfolder
    for folder_name in os.listdir(base_dir):
        folder_path = os.path.join(base_dir, folder_name)

        # Skip if not a directory
        if not os.path.isdir(folder_path):
            continue

        # Find PDF file in the folder
        pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]

        if not pdf_files:
            print(f"No PDF found in {folder_path}")
            continue

        # Process each PDF (usually just one)
        for pdf_file in pdf_files:
            pdf_path = os.path.join(folder_path, pdf_file)
            pngs_dir = os.path.join(folder_path, "pngs")

            pdf_to_png(pdf_path, pngs_dir)

if __name__ == "__main__":
    main()
