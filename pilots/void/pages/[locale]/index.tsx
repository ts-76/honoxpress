import {
  Callout,
  Cards,
  Card,
  Steps,
  Step,
  Accordion,
  AccordionItem,
} from "@components/docs-content";
import CodeGroup from "@components/code-group";
import { copy, type Locale } from "../../integration/site";

export default function Components({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <>
      <h1>{t.overview}</h1>
      <p>{t.description}</p>
      <Callout type="info" title={t.notice}>
        <p>{t.noticeText}</p>
      </Callout>
      <h2 id="cards">{t.cards}</h2>
      <Cards>
        <Card title={t.cardOne}>
          <p>{t.cardOneText}</p>
        </Card>
        <Card title={t.cardTwo}>
          <p>{t.cardTwoText}</p>
        </Card>
      </Cards>
      <h2 id="workflow">{t.steps}</h2>
      <Steps>
        <Step title={t.stepOne}>
          <p>{t.stepOneText}</p>
        </Step>
        <Step title={t.stepTwo}>
          <p>{t.stepTwoText}</p>
        </Step>
      </Steps>
      <Accordion>
        <AccordionItem title={t.accordion}>
          <p>{t.answer}</p>
        </AccordionItem>
      </Accordion>
      <h2 id="code">{t.code}</h2>
      <CodeGroup
        ariaLabel={t.code}
        samples={[
          {
            label: "TypeScript",
            filename: "page.tsx",
            language: "tsx",
            code: 'export default function Page() {\n  return <Callout title="Hello">Void + honoxpress</Callout>;\n}',
            copyLabel: t.copy,
            copiedLabel: t.copied,
            errorLabel: t.copyError,
          },
          {
            label: "JavaScript",
            filename: "page.jsx",
            language: "jsx",
            code: "export default function Page() {\n  return <p>Hello from Void</p>;\n}",
            copyLabel: t.copy,
            copiedLabel: t.copied,
            errorLabel: t.copyError,
          },
        ]}
      />
    </>
  );
}
