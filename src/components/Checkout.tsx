import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useDemoModeStore } from '../store/demoModeStore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { checkSlotAvailability, bookTimeSlot } from '../services/timeSlots';
import { OrderDetails } from '../types';

const Checkout: React.FC = () => {
  const { items, getTotal, clearCart, collectionTime } = useCartStore();
  const { isDemoMode } = useDemoModeStore();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [guestEmail, setGuestEmail] = React.useState('');
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [showTerms, setShowTerms] = React.useState(false);
  const [orderNotes, setOrderNotes] = React.useState('');

  React.useEffect(() => {
    if (items.length === 0 || !collectionTime) {
      navigate('/cart');
    }
  }, [items, collectionTime, navigate]);

  const handlePlaceOrder = async () => {
    if (!collectionTime || !termsAccepted) {
      if (!termsAccepted) {
        alert('Please accept the terms and conditions to continue.');
      }
      return;
    }

    setLoading(true);
    try {
      const isAvailable = await checkSlotAvailability(
        collectionTime.date,
        collectionTime.time
      );

      if (!isAvailable) {
        alert('Sorry, this time slot is no longer available. Please select another time.');
        navigate('/collection-time');
        return;
      }

      const orderDetails: OrderDetails = {
        items: items.map(item => ({
          product: {
            name: item.product.name,
            price: Number(item.product.price)
          },
          quantity: Number(item.quantity),
          selectedOption: item.selectedOption || null
        })),
        total: Number(getTotal()),
        pickupDate: collectionTime.date.toISOString(),
        pickupTime: collectionTime.time,
        createdAt: new Date().toISOString(),
        userId: 'guest',
        userEmail: guestEmail || 'guest',
        paymentStatus: isDemoMode ? 'completed' : 'pending',
        status: 'new',
        notes: orderNotes.trim() || null
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderDetails);
      await bookTimeSlot(collectionTime.date, collectionTime.time, orderRef.id);

      navigate('/confirmation', { 
        state: { orderDetails },
        replace: true 
      });

      setTimeout(() => clearCart(), 100);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('There was an error placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!collectionTime) return null;

  const total = getTotal();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>

      {isDemoMode && (
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6">
          <p className="font-medium">Demo Mode Active</p>
          <p className="text-sm">Orders will be processed without real payments.</p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Collection Time</h3>
        <p className="text-lg">
          {collectionTime.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })} at {collectionTime.time}
        </p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Contact Details</h3>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            type="email"
            id="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Enter your email for order updates"
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Order Notes</h3>
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (optional)
          </label>
          <textarea
            id="notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Add any special instructions or notes about your order"
            className="w-full p-2 border rounded-md h-32 resize-none"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
        {items.map((item) => (
          <div key={`${item.product.id}-${item.selectedOption || 'no-option'}`} className="flex justify-between mb-3 pb-3 border-b">
            <div>
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm">Quantity: {item.quantity}</p>
            </div>
            <p className="font-medium">£{(item.product.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>£{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex items-start gap-2 mb-4">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
          />
          <div>
            <label htmlFor="terms" className="text-sm text-gray-700">
              Please check the box to confirm that you have read and accept our terms and conditions.
            </label>
            <button
              onClick={() => setShowTerms(true)}
              className="text-sm text-blue-600 hover:text-blue-800 ml-1"
            >
              View Terms
            </button>
          </div>
        </div>

        {showTerms && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-lg mx-4">
              <h4 className="text-xl font-bold mb-4">Terms and Conditions</h4>
              <div className="text-gray-700 space-y-4">
                <p>
                  It is the responsibility of the customer to ensure they arrive at their appropriate collection time. Hot drinks will be made for the time booked and stored for a maximum of 15 mins on the warm shelf above the coffee machine. However, given the ambient temperature of the season, it cannot be guaranteed that they will remain at optimum temperature if collected later than the chosen time.
                </p>
                <p>
                  Unfortunately, drinks that are not collected within the 15 minutes of the time selected, will be disposed of immediately after. Uncollected cakes will be stored for the duration of the van opening hours on the day of booked collection only.
                </p>
                <p>
                  There will be no refunds for drinks or cakes that are left uncollected.
                </p>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate('/menu')}
          className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg text-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          Continue Shopping
        </button>
        <button
          onClick={() => navigate('/collection-time')}
          className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg text-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          Change Collection Time
        </button>
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !termsAccepted}
          className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : isDemoMode ? 'Place Demo Order' : 'Place Order'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;