export async function checkPdfExists(orderId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/shipping/pdfs/${orderId}`);
    if (response.ok) {
      const labels: string[] = await response.json();
      return labels.length > 0;
    }
    return false;
  } catch (error) {
    console.error("Error checking PDF existence:", error);
    return false;
  }
}
