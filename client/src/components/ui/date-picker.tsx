import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
  dropdownMode?: "select" | "scroll";
  dateFormat?: string;
  isClearable?: boolean;
  label?: string;
  error?: string;
}

export function CustomDatePicker({
  selected,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  maxDate,
  minDate,
  showYearDropdown = true,
  showMonthDropdown = true,
  dropdownMode = "select",
  dateFormat = "MM/dd/yyyy",
  isClearable = true,
  label,
  error
}: CustomDatePickerProps) {
  return (
    <div className="w-full mt-1.5">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-3  block">
          {label.includes('*') ? (
            <>
              {label.replace(' *', '')} <span className="text-red-600">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}
      <div className="relative w-full">
        <DatePicker
          selected={selected}
          onChange={onChange}
          customInput={
            <input
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 pr-12 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-red-500 focus-visible:ring-red-500",
                className
              )}
              placeholder={placeholder}
              disabled={disabled}
            />
          }
          maxDate={maxDate}
          minDate={minDate}
          showYearDropdown={showYearDropdown}
          showMonthDropdown={showMonthDropdown}
          dropdownMode={dropdownMode}
          dateFormat={dateFormat}
          isClearable={false}
          popperClassName="z-50"
          popperPlacement="bottom-start"
          wrapperClassName="w-full"
        />
        <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        {selected && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

// Specialized date picker for age calculation (Date of Birth)
export function DateOfBirthPicker({
  selected,
  onChange,
  error,
  placeholder
}: {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  placeholder?: string;
}) {
  const maxDate = new Date();
  const minDate = new Date('1900-01-01');
  
  return (
    <CustomDatePicker
      selected={selected}
      onChange={onChange}
      placeholder={placeholder || "Select your date of birth"}
      label="Date of Birth *"
      maxDate={maxDate}
      minDate={minDate}
      showYearDropdown={true}
      showMonthDropdown={true}
      dropdownMode="select"
      dateFormat="MM/dd/yyyy"
      isClearable={true}
      error={error}
    />
  );
}

// Specialized date picker for recent dates (Last Use Date)
export function RecentDatePicker({
  selected,
  onChange,
  error,
  placeholder
}: {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  placeholder?: string;
}) {
  const maxDate = new Date();
  const minDate = new Date('2000-01-01'); // Reasonable minimum for recent events
  
  return (
    <CustomDatePicker
      selected={selected}
      onChange={onChange}
      placeholder={placeholder || "Select date of last use"}
      label="Date of Last Use"
      maxDate={maxDate}
      minDate={minDate}
      showYearDropdown={true}
      showMonthDropdown={true}
      dropdownMode="select"
      dateFormat="MM/dd/yyyy"
      isClearable={true}
      error={error}
    />
  );
}
