export async function checkPdfExists(orderId: string): Promise<boolean> {
  try {
    const response = await fetch(`http://144.172.71.72:3003/pdf-exists/${orderId}-1.pdf`);
    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
    return false;
  } catch (error) {
    console.error('Error checking PDF existence:', error);
    return false;
  }
}