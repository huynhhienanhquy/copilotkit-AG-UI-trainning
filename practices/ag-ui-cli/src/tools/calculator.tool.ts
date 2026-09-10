import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const calculatorTool = createTool({
  id: "calculator",

  description:
    "Perform basic mathematical calculations such as addition, subtraction, multiplication, and division.",

  inputSchema: z.object({
    operation: z.enum([
      "add",
      "subtract",
      "multiply",
      "divide",
    ]),
    a: z.number(),
    b: z.number(),
  }),

  execute: async ({ operation, a, b }) => {
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;

      case "subtract":
        result = a - b;
        break;

      case "multiply":
        result = a * b;
        break;

      case "divide":
        if (b === 0) {
          throw new Error("Cannot divide by zero");
        }

        result = a / b;
        break;

      default:
        throw new Error("Unsupported operation");
    }

    return {
      result,
    };
  },
});