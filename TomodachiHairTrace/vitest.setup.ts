/** jsdom は ImageData を提供しないためテスト用の最小実装をグローバルに登録する */
class ImageDataMock {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  readonly colorSpace: PredefinedColorSpace = "srgb";

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height ?? data.length / 4 / width;
  }
}

globalThis.ImageData = ImageDataMock as unknown as typeof ImageData;
