type MDXComponents = Record<string, unknown>;

// honoxpress:components:start
import {
  Callout,
  Card,
  Cards,
  Steps,
  Step,
  Accordion,
  AccordionItem,
  TabPanel,
} from "./components/docs-content";
import Tabs from "./islands/tabs";
import CodeBlock from "./islands/copy-code";
import DemoFrame from "./components/demo-frame";
export const standardComponents = {
  Accordion,
  AccordionItem,
  Callout,
  Card,
  Cards,
  CodeBlock,
  DemoFrame,
  Step,
  Steps,
  TabPanel,
  Tabs,
};
// honoxpress:components:end

export const components = { ...standardComponents };

export function useMDXComponents(overrides: MDXComponents = {}): MDXComponents {
  return { ...components, ...overrides };
}
