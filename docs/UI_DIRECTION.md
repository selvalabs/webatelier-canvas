# Editor UI direction

## Subject and job

The product is a local visual editing console for developers and web designers. Its single job is to make the selected DOM element understandable and safely editable without covering the page being designed.

## Visual system

- **Instrument panel:** deep blue-black surfaces, restrained measurement lines and compact controls.
- **Calibration rail:** the left edge of the panel uses repeated marks as the signature element, connecting the interface to rulers and layout measurement.
- **Palette:** Ink `#EDF5FF`, Panel `#08111F`, Raised panel `#111F33`, Guide blue `#61B8FF`, Local cyan `#43DDCE`, Commit coral `#FF816A`.
- **Typography:** system sans for actions and labels; system monospace for selectors, measurements, statuses and shortcuts.
- **Motion:** one short panel-collapse transition; reduced-motion disables it.

## Restraint

The calibration rail is the single decorative risk. Other elements remain quiet, dense and functional. Coral is reserved for the primary AI action, cyan communicates local/healthy status, and blue communicates selection and measurement.

## Interaction language

- Commands use direct verbs.
- `Alt+E` changes page interaction mode.
- `Alt+P` collapses the editor panel.
- Focus is always visible.
- The shell adapts to a bottom sheet on narrow viewports.
