'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIME_RANGE_LABELS, TimeRange } from '@/types/metrics';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <Select value={value} onValueChange={v => onChange(v as TimeRange)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione o periodo" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map(key => (
          <SelectItem key={key} value={key}>
            {TIME_RANGE_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
