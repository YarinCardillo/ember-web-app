/**
 * SaturationStage - Drive / Harmonics / Mix tube saturation controls (TE style).
 */

import { TEBay } from "../ui/te/TEBay";
import { TEKnob } from "../ui/te/TEKnob";
import { Switch } from "../ui/shadcn/switch";
import { useAudioStore } from "../../store/useAudioStore";

const formatPercent = (value: number): string => `${Math.round(value * 100)} %`;

export function SaturationStage(): JSX.Element {
    const drive = useAudioStore((state) => state.drive);
    const harmonics = useAudioStore((state) => state.harmonics);
    const saturationMix = useAudioStore((state) => state.saturationMix);
    const bypassSaturation = useAudioStore((state) => state.bypassSaturation);
    const setParameter = useAudioStore((state) => state.setParameter);
    const isActive = !bypassSaturation;

    return (
        <TEBay
            label="Tube"
            aux="triode"
            action={
                <Switch
                    checked={isActive}
                    onCheckedChange={(checked) =>
                        setParameter("bypassSaturation", !checked)
                    }
                    aria-label="Tube saturation enabled"
                />
            }
            contentClassName="justify-center"
        >
            <div className="grid grid-cols-2 place-items-center gap-x-5 gap-y-7">
                <TEKnob
                    label="Drive"
                    value={drive}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={formatPercent}
                    valueOffsetX="0px"
                    onChange={(value) => setParameter("drive", value)}
                    defaultValue={0.3}
                />
                <TEKnob
                    label="Harmonics"
                    value={harmonics}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={formatPercent}
                    valueOffsetX="0px"
                    onChange={(value) => setParameter("harmonics", value)}
                    defaultValue={0.5}
                />
                <div className="col-span-2 flex justify-center">
                    <TEKnob
                        label="Mix"
                        value={saturationMix}
                        min={0}
                        max={1}
                        step={0.01}
                        formatValue={formatPercent}
                        valueOffsetX="0px"
                        onChange={(value) => setParameter("saturationMix", value)}
                        defaultValue={0.6}
                    />
                </div>
            </div>
        </TEBay>
    );
}
