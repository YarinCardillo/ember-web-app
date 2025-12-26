/**
 * PresetSelector - Dropdown for selecting amp presets
 */

import type { PresetConfig } from '../../types/audio.types';

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

  // Find the preset ID that matches the current preset name
  const currentPresetId = presetEntries.find(
    ([, preset]) => preset.name === currentPreset
  )?.[0] || '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const presetId = e.target.value;
    if (presetId && presets[presetId]) {
      onSelect(presetId, presets[presetId]);
    }
  };

  return (
    <select
      value={currentPresetId}
      onChange={handleChange}
      className="
        bg-gray-800 border border-gray-700 rounded-lg
        px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-text-light
        focus:outline-none focus:ring-2 focus:ring-ember-orange
        cursor-pointer min-w-[140px] md:min-w-[180px]
      "
    >
      <option value="">Select Preset</option>
      {presetEntries.map(([id, preset]) => (
        <option key={id} value={id}>
          {preset.name}
        </option>
      ))}
    </select>
  );
}
