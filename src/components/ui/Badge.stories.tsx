import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta = {
  title: "Design System/Badge",
  component: Badge,
  args: {
    children: "Streaming"
  },
  tags: ["autodocs"]
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Cyan: Story = {
  args: {
    tone: "cyan"
  }
};

export const Purple: Story = {
  args: {
    tone: "purple"
  }
};

export const Success: Story = {
  args: {
    tone: "success",
    children: "Ready"
  }
};
