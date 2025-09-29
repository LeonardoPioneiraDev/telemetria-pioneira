//apps/frontend/src/components/ui/DatePicker.tsx
'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// 1. Definimos as propriedades que o componente vai receber
interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className={cn(
              'justify-between font-normal',
              !date && 'text-muted-foreground',
              className
            )}
          >
            {date ? format(date, 'PPP', { locale: ptBR }) : <span>Selecione uma data</span>}
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={date => {
              setDate(date);
              setOpen(false);
            }}
            locale={ptBR}
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
