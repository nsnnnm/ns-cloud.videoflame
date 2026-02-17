use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fast_grayscale(pixels: &mut [u8]) {
    let mut i = 0;
    let len = pixels.len();

    while i < len {
        let r = pixels[i] as u16;
        let g = pixels[i + 1] as u16;
        let b = pixels[i + 2] as u16;
        let gray = ((r + g + b) / 3) as u8;

        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;

        i += 4;
    }
}
