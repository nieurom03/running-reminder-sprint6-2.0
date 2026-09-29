export function isClosedResourceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("AccessClosedResourceException") ||
    message.toLowerCase().includes("access to closed resource")
  );
}
