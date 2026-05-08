import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta = {
  title: "Design System/Avatar",
  component: Avatar,
  args: {
    name: "Emma Clarke"
  },
  tags: ["autodocs"]
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Active: Story = {
  args: {
    isActive: true,
    size: "lg"
  }
};
