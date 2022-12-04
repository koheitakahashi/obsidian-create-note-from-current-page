import { Form, ActionPanel, Action, showToast, getPreferenceValues, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "run-applescript";
import path from "path";
import fs from "fs";

type Page = {
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
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteBody, setNoteBody] = useState<string>("");

  const obsidianVaultPath = getPreferenceValues<Preferences>().obsidianVaultPath;

  const fetchCurrentPage = async (): Promise<Page> => {
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
    const [title, url] = titleAndUrl.split("\n");

    return { title: title, url: url }
  };

  useEffect(() => {
    const initializeStore = async () => {
      const page = await fetchCurrentPage();
      setNoteTitle(page.title);

      const now = new Date().toISOString()
      const formatedNow = now.substring(0, now.indexOf("T"))
      const body = `---\ntags: literature\n---\ncreated_at: ${formatedNow}\n\n[${page.title}](${page.url})`;
      setNoteBody(body);
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
      const obsidianPath = "obsidian://open?path=" + encodeURIComponent(filePath);;
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
      <Form.TextField id="noteTitle" title="Note title" value={noteTitle} onChange={setNoteTitle} />
      <Form.TextArea id="noteBody" title="Note body" value={noteBody} onChange={setNoteBody} />
    </Form>
  );
}
