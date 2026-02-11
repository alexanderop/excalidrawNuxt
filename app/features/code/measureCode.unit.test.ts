import { measureCode } from "./measureCode";

describe("measureCode", () => {
  it("returns correct lineCount for single line", () => {
    const result = measureCode("hello", 14);
    expect(result.lineCount).toBe(1);
  });

  it("returns correct lineCount for multi-line code", () => {
    const result = measureCode("line1\nline2\nline3", 14);
    expect(result.lineCount).toBe(3);
  });

  it("respects CODE_MIN_WIDTH for short code", () => {
    const result = measureCode("x", 14);
    expect(result.width).toBe(200);
  });

  it("respects CODE_MIN_HEIGHT for short code", () => {
    const result = measureCode("x", 14);
    expect(result.height).toBe(80);
  });

  it("width scales with font size", () => {
    const longLine = "a".repeat(50);
    const resultSmall = measureCode(longLine, 14);
    const resultLarge = measureCode(longLine, 28);
    expect(resultLarge.width).toBeGreaterThan(resultSmall.width);
  });

  it("height scales with number of lines", () => {
    const fewLines = "a\nb";
    const manyLines = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj";
    const resultFew = measureCode(fewLines, 14);
    const resultMany = measureCode(manyLines, 14);
    expect(resultMany.height).toBeGreaterThan(resultFew.height);
  });

  it("width accounts for padding (52 left + 16 right = 68)", () => {
    // charWidth at fontSize 14 = 8.4 * (14/14) = 8.4
    // For a line of 20 chars: contentWidth = 20 * 8.4 = 168
    // total = 168 + 52 + 16 = 236
    const result = measureCode("a".repeat(20), 14);
    expect(result.width).toBe(20 * 8.4 + 68);
  });

  it("empty string returns lineCount of 1", () => {
    const result = measureCode("", 14);
    expect(result.lineCount).toBe(1);
  });
});
