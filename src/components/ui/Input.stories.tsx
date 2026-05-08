import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta = {
  title: "Design System/Input",
  component: Input,
  args: {
    label: "Email",
    placeholder: "you@example.com"
  },
  tags: ["autodocs"]
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHelper: Story = {
  args: {
    helperText: "Use the address you registered with."
  }
};

export const Error: Story = {
  args: {
    error: "Enter a valid email address."
  }
};
