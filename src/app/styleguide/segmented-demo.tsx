"use client";

import { useState } from "react";

import { SegmentedControl, type SegmentedOption } from "@/components/ui";

type DemoValue = "roadmap" | "skill" | "progress";

const options: Array<SegmentedOption<DemoValue>> = [
  { value: "roadmap", label: "Roadmap" },
  { value: "skill", label: "Skill practice" },
  { value: "progress", label: "My Progress" },
];

const optionsWithDisabled: Array<SegmentedOption<DemoValue>> = [
  { value: "roadmap", label: "Roadmap" },
  { value: "skill", label: "Skill practice", disabled: true },
  { value: "progress", label: "My Progress" },
];

/**
 * Interactive styleguide demo for SegmentedControl — isolated in its own
 * client component so the styleguide page itself can stay a server
 * component (it still gates on NODE_ENV via notFound()).
 */
export function StyleguideSegmentedDemo() {
  const [value, setValue] = useState<DemoValue>("roadmap");
  const [disabledDemoValue, setDisabledDemoValue] = useState<DemoValue>("roadmap");

  return (
    <div className="grid gap-6">
      <div>
        <p className="instrument-label">Default / all options enabled</p>
        <div className="mt-2">
          <SegmentedControl label="Styleguide demo switcher" options={options} value={value} onChange={setValue} />
        </div>
        <p className="font-instrument mt-3 text-[0.62rem] text-zinc-500">
          Selected: <span className="text-zinc-300">{value}</span> · role=&quot;radiogroup&quot; of role=&quot;radio&quot;.
          Tab in once, then ArrowLeft/Right/Up/Down/Home/End move focus and selection together.
        </p>
      </div>
      <div>
        <p className="instrument-label">With a disabled option (skipped by arrow-key navigation)</p>
        <div className="mt-2">
          <SegmentedControl
            label="Styleguide demo switcher, disabled middle option"
            options={optionsWithDisabled}
            value={disabledDemoValue}
            onChange={setDisabledDemoValue}
          />
        </div>
      </div>
    </div>
  );
}
