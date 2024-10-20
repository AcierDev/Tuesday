// AddressForm.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Address } from "@/typings/interfaces";

interface AddressFormProps {
  fromAddress: Address;
  toAddress: Address;
  customerName: string;
  setCustomerName: (name: string) => void;
  updateFromAddress: (field: keyof Address, value: string) => void;
  updateToAddress: (field: keyof Address, value: string) => void;
}

const AddressForm: React.FC<AddressFormProps> = ({
  fromAddress,
  toAddress,
  customerName,
  setCustomerName,
  updateFromAddress,
  updateToAddress,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label
          className="text-sm font-medium text-gray-700"
          htmlFor="fromPostalCode"
        >
          From Postal Code *
        </Label>
        <Input
          required
          className="border-gray-300 focus:ring-black focus:border-black"
          id="fromPostalCode"
          placeholder="Enter from postal code"
          value={fromAddress.postalCode}
          onChange={(e) => updateFromAddress("postalCode", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          className="text-sm font-medium text-gray-700"
          htmlFor="customerName"
        >
          Customer Name
        </Label>
        <Input
          className="border-gray-300 focus:ring-black focus:border-black"
          id="customerName"
          placeholder="Enter customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          className="text-sm font-medium text-gray-700"
          htmlFor="addressLine1"
        >
          Address Line 1
        </Label>
        <Input
          className="border-gray-300 focus:ring-black focus:border-black"
          id="addressLine1"
          placeholder="Enter address line 1"
          value={toAddress.line1}
          onChange={(e) => updateToAddress("line1", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          className="text-sm font-medium text-gray-700"
          htmlFor="addressLine2"
        >
          Address Line 2
        </Label>
        <Input
          className="border-gray-300 focus:ring-black focus:border-black"
          id="addressLine2"
          placeholder="Enter address line 2 (optional)"
          value={toAddress.line2}
          onChange={(e) => updateToAddress("line2", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700" htmlFor="city">
          City
        </Label>
        <Input
          className="border-gray-300 focus:ring-black focus:border-black"
          id="city"
          placeholder="Enter city"
          value={toAddress.city}
          onChange={(e) => updateToAddress("city", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700" htmlFor="state">
          State * (2-letter code)
        </Label>
        <Input
          required
          className="border-gray-300 focus:ring-black focus:border-black"
          id="state"
          maxLength={2}
          placeholder="Enter state code (e.g., CA)"
          value={toAddress.state}
          onChange={(e) => updateToAddress("state", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          className="text-sm font-medium text-gray-700"
          htmlFor="postalCode"
        >
          Postal Code *
        </Label>
        <Input
          required
          className="border-gray-300 focus:ring-black focus:border-black"
          id="postalCode"
          placeholder="Enter postal code"
          value={toAddress.postalCode}
          onChange={(e) => updateToAddress("postalCode", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700" htmlFor="country">
          Country * (2-letter code)
        </Label>
        <Input
          required
          className="border-gray-300 focus:ring-black focus:border-black"
          id="country"
          maxLength={2}
          placeholder="Enter country code (e.g., US)"
          value={toAddress.country}
          onChange={(e) => updateToAddress("country", e.target.value)}
        />
      </div>
    </div>
  );
};

export default AddressForm;
