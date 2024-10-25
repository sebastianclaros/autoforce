import { merge } from "../helpers/merge";

describe("merge library", () => {
  test("simple merge", () => {
    const oldContent = `1<!-- start a1 -->
    to be replaced
    <!-- end a1 -->2
    3<!-- start a2 -->
    to be deleted
    <!-- end a2 -->4`;
    const newContent = `<!-- start a1 -->
    replaced
    <!-- end a1 -->
    <!-- start a3 -->
    to be inserted
    <!-- end a3 -->`;
    const toBeMerged = `1<!-- start a1 -->
    replaced
    <!-- end a1 -->2
    34<!-- start a3 -->
    to be inserted
    <!-- end a3 -->`;

    const mergedContent = merge(newContent, oldContent);
    expect(mergedContent).toBe(toBeMerged);
  });
});
