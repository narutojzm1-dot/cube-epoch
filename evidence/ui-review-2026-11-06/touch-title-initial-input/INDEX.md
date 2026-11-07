# Initial locator input failure · retained, not current UI-026 coverage

Original before.log and two 320×568 PNGs/screenshots.json are preserved unmodified.
The run stopped at tests/touch-title.mjs activation visibility assertion for #btn-start, before entering a game.
locator.tap on an already-center-visible knight card still automatically scrolled its entire element, moving the start button outside the viewport.
Manifest repro_steps describe the intended complete scenario, not actions completed in this failed run; no gathering, pause/reselect, or victory occurred here.
The successful current batch uses native coordinate touchscreen.tap/mouse.click with the original visible-center assertion retained.
No product change was made to address this automation-input issue. These two archived images are not included in the current 27-image batch.
