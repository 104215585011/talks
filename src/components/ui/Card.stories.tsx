import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";
import { Card } from "./Card";

const meta = {
  title: "Design System/Card",
  component: Card,
  args: {
    title: "Conversation Quality",
    subtitle: "Glass panel surface for dense product UI.",
    children: (
      <p className="text-sm text-slate-300">
        Correction, vocabulary, and fluency signals appear here.
      </p>
    )
  },
  tags: ["autodocs"]
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    actions: <Badge tone="cyan">Live</Badge>
  }
};
