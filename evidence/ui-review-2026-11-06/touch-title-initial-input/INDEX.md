# Initial locator input failure · retained, not current UI-026 coverage

Original before.log and eight PNGs/screenshots.json are preserved unmodified.
320×568 and 390×844 each completed initial/footer/reopened title captures (six images); the reopened data records seen=1 and no current game after the ordinary pause/reselect reload.
844×390 captured initial/footer titles (two images), then stopped at the #btn-start activation visibility assertion before entering that viewport's game. The 1280×800 case did not run.
locator.tap on an already-center-visible knight card still automatically scrolled its entire element, moving the start button outside the viewport.
Manifest repro_steps describe the intended complete scenario, not proof that all four viewports completed. No victory fixture or victory occurred. The partial run has no final validation.json/input-log archive because the function failed before the end-of-run write.
The successful current batch uses native coordinate touchscreen.tap/mouse.click with the original visible-center assertion retained.
No product change was made to address this automation-input issue. These eight archived images are not included in the current 27-image batch.
