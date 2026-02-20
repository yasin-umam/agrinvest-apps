/*
  # Add automatic notification creation for pending orders
  
  1. Changes
    - Create trigger function to automatically create notification when order is created with pending status
    - Create trigger to call the function on order insert
    
  2. Notifications
    - User receives notification immediately when order is created with pending status
    - Notification includes order details and informs user to wait for admin validation
*/

-- Create function to notify user when order is pending
CREATE OR REPLACE FUNCTION notify_pending_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if order is pending
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    SELECT 
      NEW.user_id,
      'trade',
      'Transaksi Menunggu Validasi',
      'Transaksi ' || NEW.type || ' sebanyak ' || NEW.quantity || ' ' || cp.unit || ' ' || cp.name || 
      ' senilai Rp ' || NEW.total_amount::numeric::text || ' sedang menunggu validasi admin. ' ||
      CASE 
        WHEN NEW.type = 'buy' THEN 'Saldo Anda akan dipotong setelah transaksi disetujui.'
        ELSE 'Saldo Anda akan ditambah setelah transaksi disetujui.'
      END,
      jsonb_build_object(
        'order_id', NEW.id,
        'status', 'pending',
        'product_name', cp.name,
        'quantity', NEW.quantity,
        'total_amount', NEW.total_amount
      ),
      false
    FROM chili_products cp
    WHERE cp.id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS order_pending_notification ON orders;

CREATE TRIGGER order_pending_notification
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_order();
