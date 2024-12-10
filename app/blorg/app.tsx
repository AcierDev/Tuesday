import { useState } from "react";
import { Card, Button, Form, Input, DatePicker, Select } from "antd";

interface RideShare {
  id: number;
  date: string;
  time: string;
  pickupLocation: string;
  seatsAvailable: number;
  contactInfo: string;
  direction: "to" | "from";
}

export default function NewarkRideshare() {
  const [rides, setRides] = useState<RideShare[]>([]);
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    const newRide: RideShare = {
      id: Date.now(),
      date: values.date.format("YYYY-MM-DD"),
      time: values.time,
      pickupLocation: values.pickupLocation,
      seatsAvailable: values.seatsAvailable,
      contactInfo: values.contactInfo,
      direction: values.direction,
    };
    setRides([...rides, newRide]);
    form.resetFields();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Newark Airport Rideshare</h1>

      {/* Post a Ride Form */}
      <Card title="Post a Ride" className="mb-8">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="direction"
            label="Direction"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="to">To Newark Airport</Select.Option>
              <Select.Option value="from">From Newark Airport</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="time" label="Time" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="pickupLocation"
            label="Pickup Location"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="seatsAvailable"
            label="Seats Available"
            rules={[{ required: true }]}
          >
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item
            name="contactInfo"
            label="Contact Information"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Post Ride
          </Button>
        </Form>
      </Card>

      {/* Available Rides List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Rides</h2>
        <div className="space-y-4">
          {rides.map((ride) => (
            <Card key={ride.id} className="shadow-sm">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">
                    {ride.direction === "to" ? "To" : "From"} Newark Airport
                  </p>
                  <p>Date: {ride.date}</p>
                  <p>Time: {ride.time}</p>
                  <p>Pickup: {ride.pickupLocation}</p>
                  <p>Seats Available: {ride.seatsAvailable}</p>
                </div>
                <div>
                  <Button type="primary">Contact: {ride.contactInfo}</Button>
                </div>
              </div>
            </Card>
          ))}
          {rides.length === 0 && (
            <p className="text-gray-500 text-center">No rides available</p>
          )}
        </div>
      </div>
    </div>
  );
}
