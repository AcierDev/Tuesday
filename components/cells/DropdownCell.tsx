import { useState, useRef, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { XCircleIcon, Star, UserX, UserPlus } from 'lucide-react';
import { boardConfig } from '../../config/boardconfig';
import { toast } from 'sonner';
import { Board, ColumnTitles, EmployeeNames, GenericColumnValue, Item } from '@/typings/types';

const optionImages = {
  'AM': '/images/akiva.png',
  'BC': '/images/akiva.png',
  'AW': '/images/akiva.png',
};

const convertInitialsToFullName = (initials: string): EmployeeNames | null => {
  switch (initials.toUpperCase()) {
    case 'AW': return EmployeeNames.Akiva;
    case 'AM': return EmployeeNames.Alex;
    case 'BC': return EmployeeNames.Ben;
    default: return null;
  }
};

const convertFullNameToInitials = (fullName: EmployeeNames): string => {
  switch (fullName) {
    case EmployeeNames.Akiva: return 'AW';
    case EmployeeNames.Alex: return 'AM';
    case EmployeeNames.Ben: return 'BC';
    default: return '';
  }
};

export function DropdownCell({ item, columnValue, onUpdate, board }: { item: Item, columnValue: GenericColumnValue, onUpdate: (updatedItem: Item, changedField: ColumnTitles) => void, board: Board }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleUpdate = async (newValue: string, credit?: string | null) => {
    try {
      const updatedItem = {
        ...item,
        values: item.values.map((value) =>
          value.columnName === columnValue.columnName
            ? { 
                ...value, 
                text: newValue, 
                lastModifiedTimestamp: Date.now(), 
                credit: credit ? [convertInitialsToFullName(credit)] : []
              }
            : value
        )
      };
      await onUpdate(updatedItem, columnValue.columnName);
      toast.success("Value updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the value. Please try again.");
    }
  };

  const creditOptions = ['AM', 'BC', 'AW'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownTriggerRef.current && !dropdownTriggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentCredit = columnValue.credit && columnValue.credit.length > 0 ? convertFullNameToInitials(columnValue.credit[0]) : null;
  const currentCreditImage = currentCredit ? optionImages[currentCredit] : null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild ref={dropdownTriggerRef}>
          <Button
            className={`
              relative
              ${columnValue.columnName === 'Design' || columnValue.columnName === 'Size'
                ? 'inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white bg-sky-500 dark:bg-sky-600 rounded-full hover:bg-sky-600 dark:hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-colors'
                : 'w-full h-full justify-center p-2 text-gray-900 dark:text-gray-100'
              }
              ${currentCreditImage ? 'bg-cover bg-center' : ''}
            `}
            style={currentCreditImage ? { backgroundImage: `url(${currentCreditImage})` } : {}}
            variant="ghost"
          >
            <span className={`${currentCreditImage ? 'bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70 px-1 rounded' : ''}`}>
              {columnValue.text || '⠀'}
            </span>
            {currentCredit && (
              <div className="absolute -top-2 -left-2 w-6 h-6">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <span className="absolute inset-0 flex items-center justify-center text-black dark:text-white text-[10px] font-bold">
                  {currentCredit}
                </span>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          {boardConfig.columns[columnValue.columnName].options?.map((option) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => handleUpdate(option)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {option}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />
          <DropdownMenuItem onSelect={() => setIsCreditDialogOpen(true)} className="hover:bg-gray-100 dark:hover:bg-gray-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Credit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => handleUpdate(columnValue.text || '', null)}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <UserX className="mr-2 h-4 w-4" />
            Reset Credit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => handleUpdate('')}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XCircleIcon className="mr-2 h-4 w-4" />
            Reset Value
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Credit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {creditOptions.map((credit) => (
              <Button
                key={credit}
                onClick={() => {
                  handleUpdate(columnValue.text!, credit);
                  setIsCreditDialogOpen(false);
                }}
                className="flex items-center justify-start p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div
                  className="w-8 h-8 rounded-full bg-cover bg-center mr-2"
                  style={{ backgroundImage: `url(${optionImages[credit]})` }}
                />
                <span>{credit}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}