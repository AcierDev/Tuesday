export async function checkPdfExists(orderId: string): Promise<boolean> {
  try {
    const response = await fetch('http://144.172.71.72:3003/filenames');
    if (!response.ok) {
      throw new Error('Failed to fetch filenames');
    }
    
    const filenames: string[] = await response.json();

    // Check if there's a PDF file with the order ID as its name
    return filenames.some(filename => filename.toLowerCase() === `${orderId.toLowerCase()}.pdf`);
  } catch (error) {
    console.error('Error checking PDF existence:', error);
    return false;
  }
}