import { tryCatch, tryCatchSync } from "./tryCatch";

describe("tryCatch", () => {
  describe("async tryCatch", () => {
    it("returns [null, value] for a resolved promise", async () => {
      const [error, value] = await tryCatch(Promise.resolve(42));
      expect(error).toBeNull();
      expect(value).toBe(42);
    });

    it("returns [error, null] for a rejected promise with Error", async () => {
      const original = new Error("something broke");
      const [error, value] = await tryCatch(Promise.reject(original));
      expect(value).toBeNull();
      expect(error).toBe(original);
    });

    it("wraps non-Error rejection in Error", async () => {
      const [error, value] = await tryCatch(Promise.reject("string error"));
      expect(value).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toBe("string error");
    });

    it("handles resolved promise with complex value", async () => {
      const data = { id: 1, name: "test" };
      const [error, value] = await tryCatch(Promise.resolve(data));
      expect(error).toBeNull();
      expect(value).toEqual(data);
    });

    it("handles resolved promise with null value", async () => {
      const [error, value] = await tryCatch(Promise.resolve(null));
      expect(error).toBeNull();
      expect(value).toBeNull();
    });
  });

  describe("tryCatchSync", () => {
    it("returns [null, value] for successful function", () => {
      const [error, value] = tryCatchSync(() => 42);
      expect(error).toBeNull();
      expect(value).toBe(42);
    });

    it("returns [error, null] when function throws Error", () => {
      const original = new Error("sync failure");
      const [error, value] = tryCatchSync(() => {
        throw original;
      });
      expect(value).toBeNull();
      expect(error).toBe(original);
    });

    it("wraps non-Error throw in Error", () => {
      const [error, value] = tryCatchSync(() => {
        throw "string thrown";
      });
      expect(value).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toBe("string thrown");
    });

    it("wraps number throw in Error", () => {
      const [error, value] = tryCatchSync(() => {
        throw 404;
      });
      expect(value).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(error!.message).toBe("404");
    });

    it("returns complex values on success", () => {
      const data = { items: [1, 2, 3] };
      const [error, value] = tryCatchSync(() => data);
      expect(error).toBeNull();
      expect(value).toEqual(data);
    });
  });
});
