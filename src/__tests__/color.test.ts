import { getColored } from "../helpers/color";

describe("color library", () => {
  test("test getColored", () => {

    const coloredText = getColored('Hola Mundo', 'red');
    expect(coloredText).toBe('\x1b[31mHola Mundo\x1b[0m');
  });
});
