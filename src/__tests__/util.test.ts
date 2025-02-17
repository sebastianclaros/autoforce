import { camelToText } from "../helpers/util";

describe("util helper", () => {
    test("camelToText", () => {
        const coloredText = camelToText('holaMundoFeliz');
        expect(coloredText).toBe('hola Mundo Feliz');
    
    });
});