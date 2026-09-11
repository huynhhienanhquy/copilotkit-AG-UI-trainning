export function openUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return {
      success: true,
      url: parsedUrl.toString(),
    };
  } catch {
    return {
      success: false,
      error: "Invalid URL.",
    };
  }
}