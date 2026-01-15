/**
 * PresetSelector - Premium dropdown for selecting amp presets
 */

import type { PresetConfig } from "../../types/audio.types";
import presets from "../../audio/presets/amp-presets.json";

const STARTER_PRESET = presets.starter as PresetConfig;

interface PresetSelectorProps {
  presets: Record<string, PresetConfig>;
  currentPreset: string | null;
  onSelect: (presetId: string, preset: PresetConfig) => void;
}

export function PresetSelector({
  presets,
  currentPreset,
  onSelect,
}: PresetSelectorProps): JSX.Element {
  const presetEntries = Object.entries(presets);

  const isStarterPreset = currentPreset === "Starter Preset";
  const currentPresetId = isStarterPreset
    ? "starter"
    : presetEntries.find(([, preset]) => preset.name === currentPreset)?.[0] ||
      "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const presetId = e.target.value;
    if (presetId === "starter") {
      onSelect("starter", STARTER_PRESET);
    } else if (presetId && presets[presetId]) {
      onSelect(presetId, presets[presetId]);
    }
  };

  return (
    <select
      value={currentPresetId}
      onChange={handleChange}
      className="
        bg-bg-secondary text-text-primary rounded-lg
        px-3 py-2 md:px-4 md:py-3 text-sm md:text-base
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
        cursor-pointer min-w-0 flex-1 sm:flex-initial sm:min-w-[180px]
        transition-colors duration-150
        hover:bg-bg-hover
      "
      style={{
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <option value="starter">Starter Preset</option>
      {presetEntries
        .filter(([id]) => id !== "starter")
        .map(([id, preset]) => (
          <option key={id} value={id}>
            {preset.name}
          </option>
        ))}
    </select>
  );
}
