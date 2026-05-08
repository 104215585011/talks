import type { Meta, StoryObj } from "@storybook/react";
import { Send } from "lucide-react";
import { Button } from "./Button";

const meta = {
  title: "Design System/Button",
  component: Button,
  args: {
    children: "Continue"
  },
  parameters: {
    docs: {
      description: {
        component: "Primary command primitive with loading, icon, disabled, and tone variants."
      }
    }
  },
  tags: ["autodocs"]
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary"
  }
};

export const WithIcon: Story = {
  args: {
    icon: <Send aria-hidden="true" size={16} />
  }
};

export const Loading: Story = {
  args: {
    isLoading: true
  }
};
