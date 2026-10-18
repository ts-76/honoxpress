import { TypeTable } from "../components/type-table";
export default function Properties() {
  return (
    <TypeTable
      properties={[{ name: "title", type: "string", description: "Page title", required: true }]}
    />
  );
}
