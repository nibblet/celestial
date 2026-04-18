"use client";

import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Image from "@tiptap/extension-image";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { useEffect, useRef } from "react";
import {
  MentionList,
  type MentionListHandle,
  type PersonSuggestion,
} from "./MentionSuggestion";

export interface MentionEntry {
  id: string;
  label: string;
  slug: string;
}

interface Props {
  initialHTML?: string;
  onChange: (html: string, mentions: MentionEntry[]) => void;
  placeholder?: string;
  onReady?: (editor: Editor) => void;
}

/**
 * Rich editor built on TipTap. Supports StarterKit (headings, lists, bold,
 * italic, etc.) and @mentions sourced from /api/people. Emits HTML plus the
 * set of person mentions currently in the document.
 */
export function TipTapEditor({ initialHTML, onChange, placeholder, onReady }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: { class: "rounded-lg my-3 max-w-full h-auto" },
        inline: false,
        allowBase64: false,
      }),
      Mention.extend({
        addAttributes() {
          return {
            id: {
              default: null,
              parseHTML: (el) => el.getAttribute("data-person-id"),
              renderHTML: (attrs) => ({ "data-person-id": attrs.id }),
            },
            label: {
              default: null,
              parseHTML: (el) => el.getAttribute("data-person-label"),
              renderHTML: (attrs) => ({ "data-person-label": attrs.label }),
            },
            slug: {
              default: null,
              parseHTML: (el) => el.getAttribute("data-person-slug"),
              renderHTML: (attrs) => ({ "data-person-slug": attrs.slug }),
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class:
            "inline-block rounded bg-clay-pale px-1 text-clay font-medium no-underline",
          "data-person": "true",
        },
        renderHTML({ node }) {
          const id = node.attrs.id ?? "";
          const label = node.attrs.label ?? "";
          const slug = node.attrs.slug ?? "";
          return [
            "a",
            {
              href: `/people/${slug}`,
              class:
                "inline-block rounded bg-clay-pale px-1 text-clay font-medium no-underline",
              "data-person-id": id,
              "data-person-slug": slug,
              "data-mention": "true",
            },
            `@${label}`,
          ];
        },
        suggestion: {
          char: "@",
          items: async ({ query }) => {
            const res = await fetch(
              `/api/people?q=${encodeURIComponent(query)}&limit=8`
            );
            if (!res.ok) return [];
            const data = (await res.json()) as { people: PersonSuggestion[] };
            const items: PersonSuggestion[] = data.people.slice(0, 8);
            if (query.trim().length >= 2) {
              items.push({
                id: "__new__",
                slug: "__new__",
                display_name: query,
                relationship: null,
                isNew: true,
              });
            }
            return items;
          },
          render: () => {
            let component: ReactRenderer<MentionListHandle> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart(props) {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });
                if (!props.clientRect) return;
                popup = tippy("body", {
                  getReferenceClientRect: () =>
                    props.clientRect!() ?? new DOMRect(),
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate(props) {
                component?.updateProps(props);
                if (!props.clientRect) return;
                popup?.[0]?.setProps({
                  getReferenceClientRect: () =>
                    props.clientRect!() ?? new DOMRect(),
                });
              },
              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props.event) ?? false;
              },
              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
                component = null;
                popup = null;
              },
            };
          },
        },
      }),
    ],
    content: initialHTML || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-story max-w-none min-h-[380px] px-3 py-2 focus:outline-none",
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const mentions: MentionEntry[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "mention") {
          mentions.push({
            id: String(node.attrs.id ?? ""),
            label: String(node.attrs.label ?? ""),
            slug: String(node.attrs.slug ?? ""),
          });
        }
      });
      onChangeRef.current(html, mentions);
    },
  });

  // Placeholder fallback: TipTap has no placeholder in StarterKit here;
  // swap in a soft CSS::before when empty.
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;
    // eslint-disable-next-line react-hooks/immutability
    el.dataset.placeholder = placeholder || "";
    return () => {
      delete el.dataset.placeholder;
    };
  }, [editor, placeholder]);

  // Hand the editor back up so the outer component can insert images at the
  // caret from the media gallery.
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-warm-white">
      <EditorContent editor={editor} />
    </div>
  );
}
