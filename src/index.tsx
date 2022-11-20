import { Form, ActionPanel, Action, showToast, getPreferenceValues, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "run-applescript";
import path from "path";
import fs from "fs";

type Link = {
  title: string;
  url: string;
}

type Values = {
  noteTitle: string;
  noteBody: string;
};

interface Preferences {
  obsidianVaultPath: string;
}

export default function Command() {
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");

  const obsidianVaultPath = getPreferenceValues<Preferences>().obsidianVaultPath;

  const frontMostBrowserLink = async (): Promise<Link> => {
    const titleAndUrl = await runAppleScript(`
      tell application "System Events" to set frontApp to name of first process whose frontmost is true
      if frontApp = "Google Chrome"
        using terms from application "Google Chrome"
          tell application frontApp to set currentTabTitle to title of active tab of front window
          tell application frontApp to set currentTabUrl to URL of active tab of front window
        end using terms from
        return currentTabTitle & "\n" & currentTabUrl
      end if
    `);

    const [originalTitle, originalUrl] = titleAndUrl.split("\n");

    return { title: originalTitle, url: originalUrl }
  };

  useEffect(() => {
    const initializeStore = async () => {
      const link = await frontMostBrowserLink();
      setTitle(link.title);

      const now = new Date().toISOString()
      const formatedNow = now.substring(0, now.indexOf("T"))
      const body = `---\ntags: learned\n---\ncreated_at: ${formatedNow}\n\n[${link.title}](${link.url})`;
      setBody(body);
    };

    initializeStore();
  }, []);

  function handleSubmit(values: Values) {
    const filePath = path.join(obsidianVaultPath, values.noteTitle + ".md");

    try {
      fs.writeFileSync(filePath, values.noteBody)
    } catch {
      showToast({ title: "Couldn't write to file:", message: filePath + ".md" });
    }
    showToast({ title: "Submitted form", message: "See logs for submitted values" });

    setTimeout(() => {
      const obsidianPath = "obsidian://open?path=" + encodeURIComponent(path.join(filePath + ".md"));;
      open(obsidianPath);
    }, 200)
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="noteTitle" title="Note title" value={title} onChange={setTitle} />
      <Form.TextArea id="noteBody" title="Note body" value={body} onChange={setBody} />
    </Form>
  );
}
