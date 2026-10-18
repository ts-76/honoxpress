import { createRoute } from "honox/factory";
import { tree } from "../../../content/en.md?docs-markdown";
import { MarkdownContent } from "../../markdown-content";

export default createRoute((c) => c.render(<MarkdownContent tree={tree} />));
