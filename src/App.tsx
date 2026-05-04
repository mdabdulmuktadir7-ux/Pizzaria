import React, { useEffect, useState, useRef } from "react";
import {
  ShoppingCart,
  MapPin,
  Phone,
  Star,
  Plus,
  Minus,
  X,
  Info,
  ChevronRight,
  Clock,
  Map,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Search,
  Package,
  Check,
  Truck,
  UserCircle,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  User,
  ConfirmationResult,
} from "firebase/auth";

// --- DATA ---
const MENU = {
  pizzas: [
    {
      id: 1,
      name: "The Salimullah Classic",
      desc: "Wood-fired crust, San Marzano tomato sauce, fresh mozzarella, local basil.",
      price: 14.99,
      img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      name: "Spicy Pepperoni",
      desc: "Crispy cup-and-char pepperoni, chili flakes, hot honey drizzle.",
      price: 16.99,
      img: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      name: "Truffle Mushroom",
      desc: "Roasted wild mushrooms, truffle oil, ricotta, thyme.",
      price: 18.99,
      img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 4,
      name: "Rustic BBQ Chicken",
      desc: "Smoked gouda, red onions, cilantro, house BBQ sauce.",
      price: 17.5,
      img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    },
  ],
  sides: [
    {
      id: 5,
      name: "Garlic Knots",
      desc: "Oven-baked dough tossed in garlic butter and parmesan.",
      price: 6.99,
      img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Garlic_knots.jpg/600px-Garlic_knots.jpg",
    },
    {
      id: 6,
      name: "Caprese Salad",
      desc: "Fresh tomatoes, mozzarella, balsamic glaze.",
      price: 9.99,
      img: "https://images.unsplash.com/photo-1608897013039-887f214b985c?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 7,
      name: "Truffle Fries",
      desc: "Crispy shoestring fries tossed in truffle oil and parmesan.",
      price: 7.99,
      img: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=600&q=80",
    },
  ],
  beverages: [
    {
      id: 8,
      name: "Craft Cola",
      desc: "Locally brewed cane sugar cola.",
      price: 3.99,
      img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 9,
      name: "San Pellegrino",
      desc: "Sparkling water.",
      price: 2.99,
      img: "https://images.unsplash.com/photo-1559839914-11aaeebbc99a?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 10,
      name: "House Lemonade",
      desc: "Fresh squeezed lemons, subtle mint.",
      price: 3.5,
      img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    },
  ],
  sauces: [
    {
      id: 11,
      name: "Hot Honey",
      desc: "Sweet and spicy chili-infused honey.",
      price: 1.5,
      img: "https://images.unsplash.com/photo-1587049352847-4d4b12405451?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 12,
      name: "Garlic Butter",
      desc: "Roasted garlic and herb dip.",
      price: 2.0,
      img: "https://images.unsplash.com/photo-1600289031464-74d374b64991?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 13,
      name: "Marinara Dip",
      desc: "Our signature San Marzano sauce.",
      price: 1.0,
      img: "https://images.unsplash.com/photo-1472476449509-8446ab56a312?auto=format&fit=crop&w=600&q=80",
    },
  ],
};

const TESTIMONIALS = [
  {
    id: 1,
    text: "Best pizza on Salimullah Road! The crust is perfectly blistered every single time.",
    author: "Sarah J.",
  },
  {
    id: 2,
    text: "Our go-to Friday night spot. The spicy pepperoni with hot honey is absolutely addictive.",
    author: "Mark T.",
  },
  {
    id: 3,
    text: "Fast delivery and the pizza always arrives hot. Real Italian vibe right here in the neighborhood.",
    author: "Elena R.",
  },
];

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

// --- TYPES ---
type CartItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  img?: string;
  toppings?: { name: string; price: number }[];
  note?: string;
};

const AVAILABLE_TOPPINGS = [
  { name: "Extra Cheese", price: 1.5 },
  { name: "Mushrooms", price: 1.0 },
  { name: "Pepperoni", price: 2.0 },
  { name: "Black Olives", price: 1.0 },
  { name: "Jalapeños", price: 1.0 },
  { name: "Onions", price: 0.5 },
];

// --- COMPONENTS ---
const PizzaCard: React.FC<{
  pizza: any;
  onAdd: (item: any) => void;
  delay: number;
}> = ({
  pizza,
  onAdd,
  delay,
}) => {
  const [size, setSize] = useState<8 | 10 | 12>(8);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState<
    { name: string; price: number }[]
  >([]);
  const [note, setNote] = useState("");

  const priceMultiplier = size === 8 ? 1 : size === 10 ? 1.3 : 1.69;
  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const currentPrice = (pizza.price * priceMultiplier + toppingsPrice).toFixed(
    2,
  );

  const toggleTopping = (topping: { name: string; price: number }) => {
    setSelectedToppings((prev) =>
      prev.find((t) => t.name === topping.name)
        ? prev.filter((t) => t.name !== topping.name)
        : [...prev, topping],
    );
  };

  const handleAdd = () => {
    onAdd({
      ...pizza,
      id: `${pizza.id}-${size}-${selectedToppings.map((t) => t.name).join("-")}-${note.substring(0, 5)}`,
      name: `${pizza.name} (${size}")`,
      price: parseFloat(currentPrice),
      toppings: selectedToppings,
      note: note,
    });
    // Reset state after adding
    setSize(8);
    setSelectedToppings([]);
    setNote("");
    setShowCustomize(false);
  };

  return (
    <motion.div
      layout
      className="group flex flex-col sm:flex-row gap-6 bg-white p-6 border border-stone-200 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <div className="w-full sm:w-32 h-40 sm:h-32 overflow-hidden shrink-0">
        <img
          src={pizza.img}
          alt={pizza.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex justify-between items-start mb-2 gap-4">
            <h5 className="font-serif text-lg text-stone-900 font-medium">
              {pizza.name}
            </h5>
            <span className="text-sm font-bold text-red-700 underline shrink-0">
              ${currentPrice}
            </span>
          </div>
          <p className="text-[11px] text-stone-600 leading-tight italic mb-3">
            {pizza.desc}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
              Size:
            </span>
            {[8, 10, 12].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s as any)}
                className={`px-3 py-1 text-[10px] font-bold rounded-none border transition-colors ${size === s ? "bg-stone-900 text-white border-stone-900" : "bg-transparent text-stone-500 border-stone-300 hover:border-stone-500 hover:text-stone-900"}`}
              >
                {s}"
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showCustomize && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-stone-100"
              >
                <div className="mb-4">
                  <span className="block text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    Extra Toppings
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TOPPINGS.map((topping) => (
                      <label
                        key={topping.name}
                        className="flex items-center gap-2 cursor-pointer group/label"
                      >
                        <input
                          type="checkbox"
                          checked={
                            !!selectedToppings.find(
                              (t) => t.name === topping.name,
                            )
                          }
                          onChange={() => toggleTopping(topping)}
                          className="w-3 h-3 text-red-700 border-stone-300 rounded-sm focus:ring-red-700 cursor-pointer"
                        />
                        <span className="text-[11px] text-stone-600 group-hover/label:text-stone-900">
                          {topping.name}{" "}
                          <span className="text-stone-400">
                            (+${topping.price.toFixed(2)})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    Special Instructions
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Extra crispy, no onions..."
                    className="w-full text-[11px] border border-stone-200 p-2 focus:outline-none focus:border-red-700 resize-none h-16"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-500 text-stone-700 px-4 py-2 text-[10px] uppercase tracking-[0.1em] font-bold transition-all"
          >
            {showCustomize ? "Hide Customization" : "Customize"}
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 border border-stone-900 bg-stone-900 text-white hover:bg-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.1em] font-bold transition-all"
          >
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [view, setView] = useState<
    "home" | "checkout" | "success" | "track" | "history"
  >("home");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "bkash" | "nagad" | "rocket"
  >("cod");
  const [orderId, setOrderId] = useState<string>("");
  const [trackingInputValue, setTrackingInputValue] = useState("");
  const [trackedOrderResult, setTrackedOrderResult] = useState<{
    id: string;
    status: string;
    statusIndex: number;
    createdAt?: Date;
  } | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // History State
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+880");
  const [verificationCode, setVerificationCode] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "code">("phone");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Auth Effect
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
        );
        const unsubscribeOrders = onSnapshot(
          q,
          (snapshot) => {
            const orders = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setOrderHistory(orders);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, "orders");
          },
        );
        return () => unsubscribeOrders();
      } else {
        setOrderHistory([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
    }
  };

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier,
      );
      setConfirmationResult(result);
      setLoginStep("code");
    } catch (error: any) {
      console.error(error);
      setLoginError(
        error.message || "Failed to send verification code. Please try again.",
      );
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await confirmationResult.confirm(verificationCode);
      setShowLoginModal(false);
      setLoginStep("phone");
      setVerificationCode("");
      // If they had items in cart, they might be trying to checkout
      if (cart.length > 0) {
        setIsCartOpen(false);
        setView("checkout");
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      console.error(error);
      setLoginError("Invalid verification code.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCart([]);
    setView("home");
  };

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingInputValue.trim()) {
      setTrackedOrderResult(null);
      return;
    }

    if (!user) {
      alert("Please login to track your order.");
      setShowLoginModal(true);
      return;
    }

    try {
      const docRef = doc(db, "orders", trackingInputValue);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        const data = docSnap.data();
        const statuses = [
          "Order Placed",
          "Preparing",
          "Out for Delivery",
          "Delivered",
        ];
        
        let orderTime = new Date();
        if (data.createdAt) {
          orderTime = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        }
        
        const diffMinutes = (Date.now() - orderTime.getTime()) / 60000;
        
        let sIdx = 0;
        if (data.status === "Delivered") sIdx = 3;
        else if (diffMinutes > 25) sIdx = 3;
        else if (diffMinutes > 15) sIdx = 2;
        else if (diffMinutes > 5) sIdx = 1;

        const currentStatus = sIdx === 3 ? "Delivered" : statuses[sIdx];
        
        setTrackedOrderResult({
          id: docSnap.id,
          status: currentStatus,
          statusIndex: sIdx,
          createdAt: orderTime,
        });
      } else {
        alert("Order not found or you don't have permission.");
        setTrackedOrderResult(null);
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, "orders");
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      alert("Please login to place an order.");
      setShowLoginModal(true);
      return;
    }

    const finalTotal = parseFloat((cartTotal * 1.1).toFixed(2));

    try {
      const docRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        items: cart,
        total: finalTotal,
        status: "Order Placed",
        createdAt: serverTimestamp(),
        paymentMethod: paymentMethod,
        deliveryDetails: {
          firstName,
          lastName,
          email,
          address,
        },
      });

      setOrderId(docRef.id);
      setCart([]);
      setView("success");
      window.scrollTo(0, 0);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, "orders");
    }
  };

  // SEO & Scroll setup
  useEffect(() => {
    document.title = "Best Pizza in Salimullah Road | The Salimullah Classic";

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cart Handlers
  const addToCart = (item: {
    id: number | string;
    name: string;
    price: number;
    img?: string;
  }) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    // Visual feedback
    setIsCartOpen(true);
  };

  const updateQuantity = (id: number | string, delta: number) => {
    setCart((prev) =>
      prev
        .map((p) => {
          if (p.id === id) {
            const newQty = p.quantity + delta;
            return newQty > 0 ? { ...p, quantity: newQty } : p;
          }
          return p;
        })
        .filter((p) => p.quantity > 0),
    );
  };

  const removeFromCart = (id: number | string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FDFBF7] text-stone-900 font-sans selection:bg-red-800 selection:text-white pb-20 md:pb-0">
      {/* HEADER */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-[#FDFBF7] backdrop-blur-md shadow-lg border-b border-stone-200 py-4" : "bg-[#FDFBF7] border-b border-stone-200 py-6"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-800 rounded-full hidden sm:flex items-center justify-center font-serif text-2xl font-bold italic text-white">
              S
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight uppercase text-stone-900">
                Pizzeria <span className="text-red-700">Salimullah</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Artisan Wood-Fired Pizza
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs uppercase tracking-widest font-medium">
            {view === "home" ? (
              <>
                <button
                  onClick={() => {
                    setTrackingInputValue("");
                    setTrackedOrderResult(null);
                    setView("track");
                    window.scrollTo(0, 0);
                  }}
                  className="hidden sm:inline-flex text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Track Order
                </button>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-stone-600 hover:text-red-600 transition-colors"
                  aria-label="View Cart"
                >
                  <ShoppingCart size={20} />
                  {cartItemsCount > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setView("history");
                        window.scrollTo(0, 0);
                      }}
                      className="hidden text-stone-500 md:inline-flex hover:text-stone-900 transition-colors"
                    >
                      History
                    </button>
                    <button
                      onClick={handleLogout}
                      className="hidden md:inline-flex bg-stone-100 hover:bg-stone-200 text-stone-700 px-6 py-3 rounded-sm text-xs uppercase tracking-[0.2em] font-bold transition-colors items-center gap-2"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="hidden md:inline-flex bg-stone-100 hover:bg-stone-200 text-stone-700 px-6 py-3 rounded-sm text-xs uppercase tracking-[0.2em] font-bold transition-colors items-center gap-2"
                  >
                    <UserCircle size={16} /> Log In
                  </button>
                )}
                <button
                  onClick={scrollToMenu}
                  className="hidden md:inline-flex bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-sm text-xs uppercase tracking-[0.2em] font-bold shadow-lg shadow-red-900/20 transition-colors items-center gap-2"
                >
                  Order Online
                </button>
              </>
            ) : (
              <button
                onClick={() => setView("home")}
                className="flex items-center gap-2 text-stone-600 hover:text-red-700 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Menu
              </button>
            )}
          </div>
        </div>
      </header>

      {/* LOGIN MODAL */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isLoggingIn) setShowLoginModal(false);
              }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white border border-stone-200 shadow-2xl p-8"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors"
                disabled={isLoggingIn}
              >
                <X size={20} />
              </button>

              <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-stone-600 mb-6">
                Enter your phone number to sign in or create an account.
              </p>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-widest text-center">
                  {loginError}
                </div>
              )}

              {loginStep === "phone" ? (
                <form onSubmit={requestOTP} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+8801700000000"
                      className="w-full border-b border-stone-300 py-3 bg-transparent text-lg focus:outline-none focus:border-red-700 transition-colors font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-red-700 hover:bg-red-800 disabled:bg-stone-300 disabled:text-stone-500 text-white uppercase tracking-[0.2em] py-4 font-bold text-xs transition-colors shadow-sm mt-4"
                  >
                    {isLoggingIn ? "Sending..." : "Send Pin"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                      Verification Pin
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="w-full border-b border-stone-300 py-3 bg-transparent text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-red-700 transition-colors font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-red-700 hover:bg-red-800 disabled:bg-stone-300 disabled:text-stone-500 text-white uppercase tracking-[0.2em] py-4 font-bold text-xs transition-colors shadow-sm mt-4"
                  >
                    {isLoggingIn ? "Verifying..." : "Verify & Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep("phone");
                      setVerificationCode("");
                      setLoginError("");
                    }}
                    className="w-full text-[10px] uppercase tracking-widest text-stone-500 font-bold hover:text-stone-900 transition-colors pt-2"
                  >
                    Use a different number
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div id="recaptcha-container"></div>

      {view === "home" && (
        <>
          {/* HERO SECTION */}
          <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12 bg-[#F5F2E9] border-b border-stone-200">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=2000&q=80"
                alt="Freshly baked pizza in a wood-fired oven"
                className="w-full h-full object-cover opacity-[0.03] mix-blend-multiply grayscale"
              />
              <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-[#FDFBF7]"></div>
            </div>

            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-12 md:mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="text-red-700 font-serif italic text-xl block mb-4">
                  Now Open on Salimullah Road
                </span>
                <h2 className="font-serif text-6xl md:text-8xl font-bold text-stone-900 mb-8 leading-[0.9] drop-shadow-sm uppercase tracking-tighter">
                  Authentic Wood-Fired <br className="hidden md:block" />{" "}
                  Perfection
                </h2>
                <p className="text-sm text-stone-600 mb-10 max-w-lg mx-auto leading-relaxed border-t border-stone-300 pt-6">
                  Hand-stretched dough, 48-hour cold ferment, and premium
                  ingredients fired at 900°F in our custom clay oven.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <button
                    onClick={scrollToMenu}
                    className="w-full sm:w-auto border border-stone-400 hover:border-red-700 px-8 py-3 text-xs uppercase tracking-[0.2em] hover:bg-red-700 hover:text-white text-stone-900 transition-all"
                  >
                    Start Your Order
                  </button>
                  <a
                    href="#location"
                    className="w-full sm:w-auto text-xs font-bold uppercase tracking-[0.2em] underline underline-offset-8 decoration-red-800 hover:text-red-500 transition-colors text-center text-stone-900"
                  >
                    Find Us
                  </a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* DELIVERY BANNER */}
          <div className="bg-[#8B0000] text-white py-3 text-center text-[10px] uppercase tracking-[0.3em] font-bold border-y border-red-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden relative">
              <div className="flex items-center justify-center gap-3 text-white">
                <p className="text-center">
                  Free Local Delivery to Salimullah Road & Surrounding
                  Neighborhoods
                </p>
              </div>
            </div>
          </div>

          {/* MENU SECTION */}
          <section
            id="menu"
            className="py-24 bg-[#FDFBF7] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20"
          >
            <div className="text-center mb-16">
              <h3 className="font-serif text-4xl md:text-5xl font-bold text-stone-900 mb-4">
                Our Live Menu
              </h3>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 max-w-2xl mx-auto">
                Hand-stretched and baked to order. No PDFs, just pure flavor.
              </p>
            </div>

            {/* Signature Pizzas */}
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <h4 className="text-xs uppercase tracking-[0.3em] text-red-700 font-bold">
                  Signature Pizzas
                </h4>
                <span className="text-stone-500 text-[10px] uppercase tracking-widest hidden sm:inline">
                  (Available in 8", 10", 12")
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
                {MENU.pizzas.map((pizza, i) => (
                  <PizzaCard
                    key={pizza.id}
                    pizza={pizza}
                    onAdd={addToCart}
                    delay={i * 0.1}
                  />
                ))}
              </div>
            </div>

            {/* Three Column Layout for Sides, Beverages, Sauces */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Sides */}
              <div className="bg-white p-8 border border-stone-200 shadow-sm">
                <h4 className="text-xs uppercase tracking-[0.3em] text-red-700 font-bold mb-8">
                  Sides to Share
                </h4>
                <div className="space-y-0">
                  {MENU.sides.map((side, i) => (
                    <div
                      key={side.id}
                      className="flex items-start gap-4 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2 -mx-2 rounded-sm group"
                    >
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-stone-100">
                        <img
                          src={side.img}
                          alt={side.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-serif text-lg text-stone-900 mb-1 leading-tight">
                          {side.name}
                        </h5>
                        <p className="text-[11px] text-stone-600 leading-tight italic">
                          {side.desc}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0 mt-1">
                        <span className="text-sm font-bold text-stone-700">
                          ${side.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(side)}
                          className="text-[10px] uppercase tracking-widest border border-stone-300 px-3 py-1 hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
                          aria-label={`Add ${side.name} to cart`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beverages */}
              <div className="bg-white p-8 border border-stone-200 shadow-sm">
                <h4 className="text-xs uppercase tracking-[0.3em] text-red-700 font-bold mb-8">
                  Beverages
                </h4>
                <div className="space-y-0">
                  {MENU.beverages.map((bev, i) => (
                    <div
                      key={bev.id}
                      className="flex items-start gap-4 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2 -mx-2 rounded-sm group"
                    >
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-stone-100">
                        <img
                          src={bev.img}
                          alt={bev.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-serif text-lg text-stone-900 mb-1 leading-tight">
                          {bev.name}
                        </h5>
                        <p className="text-[11px] text-stone-600 leading-tight italic">
                          {bev.desc}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0 mt-1">
                        <span className="text-sm font-bold text-stone-700">
                          ${bev.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(bev)}
                          className="text-[10px] uppercase tracking-widest border border-stone-300 px-3 py-1 hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
                          aria-label={`Add ${bev.name} to cart`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sauces */}
              <div className="bg-white p-8 border border-stone-200 shadow-sm">
                <h4 className="text-xs uppercase tracking-[0.3em] text-red-700 font-bold mb-8">
                  Dips & Sauces
                </h4>
                <div className="space-y-0">
                  {MENU.sauces.map((sauce, i) => (
                    <div
                      key={sauce.id}
                      className="flex items-start gap-4 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2 -mx-2 rounded-sm group"
                    >
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-stone-100">
                        <img
                          src={sauce.img}
                          alt={sauce.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-serif text-lg text-stone-900 mb-1 leading-tight">
                          {sauce.name}
                        </h5>
                        <p className="text-[11px] text-stone-600 leading-tight italic">
                          {sauce.desc}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0 mt-1">
                        <span className="text-sm font-bold text-stone-700">
                          ${sauce.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(sauce)}
                          className="text-[10px] uppercase tracking-widest border border-stone-300 px-3 py-1 hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
                          aria-label={`Add ${sauce.name} to cart`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section className="bg-white py-24 border-y border-stone-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
                  Loved by Our Neighbors
                </h3>
                <div className="flex justify-center gap-1 text-red-700 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-stone-500">
                  4.9/5 Average Rating from Over 500 Local Reviews
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {TESTIMONIALS.map((t, i) => (
                  <motion.div
                    key={t.id}
                    className="p-8 border border-dashed border-stone-300 bg-[#FDFBF7] flex flex-col justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                  >
                    <div className="text-stone-300 mb-4 flex justify-center">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                    <p className="text-xs text-stone-700 uppercase tracking-widest text-center leading-relaxed mb-6 flex-1 font-medium">
                      "{t.text}"
                    </p>
                    <p className="text-[10px] text-stone-500 text-center font-bold">
                      — {t.author}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* LOCATION & HOURS */}
          <section
            id="location"
            className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#FDFBF7] border border-stone-200 shadow-sm">
              <div className="h-80 lg:h-auto min-h-[400px] w-full bg-stone-100 relative order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-stone-200">
                {/* Embedded map pointing to Salimullah Road */}
                <iframe
                  src="https://maps.google.com/maps?q=Salimullah%20Road,%20Mohammadpur,%20Dhaka&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{
                    border: 0,
                    filter:
                      "contrast(90%) sepia(20%) hue-rotate(10deg) grayscale(80%)",
                  }}
                  allowFullScreen
                  aria-hidden="false"
                  tabIndex={0}
                  title="Map location of Pizzeria Salimullah"
                ></iframe>
                <div className="absolute inset-0 pointer-events-none bg-orange-900/10 mix-blend-color"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                  <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"></div>
                  <div className="mt-2 text-[10px] uppercase font-bold tracking-widest bg-white border border-stone-300 px-2 py-1 text-stone-900">
                    Salimullah Road
                  </div>
                </div>
              </div>

              <div className="p-10 lg:p-16 flex flex-col gap-12 order-1 lg:order-2">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">
                    Find Us
                  </h3>
                  <address className="not-italic text-sm text-stone-600 leading-relaxed">
                    123 Salimullah Road
                    <br />
                    Mohammadpur, Dhaka
                  </address>
                  <div className="mt-4">
                    <a
                      href="tel:+8801900000000"
                      className="text-sm font-bold underline underline-offset-4 decoration-red-800 tracking-widest text-stone-700 hover:text-red-700 transition-colors"
                    >
                      +880 19 0000 0000
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-[0.3em] text-stone-500 font-bold mb-4">
                    Kitchen Hours
                  </h3>
                  <ul className="text-[11px] space-y-2 text-stone-600 font-medium uppercase tracking-widest max-w-[250px]">
                    <li className="flex justify-between">
                      <span>Mon-Thu</span> <span>11am - 10pm</span>
                    </li>
                    <li className="flex justify-between text-stone-900 font-bold">
                      <span>Fri-Sat</span> <span>11am - 11pm</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sun</span> <span>12pm - 9pm</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-stone-200 py-12 text-center bg-[#FDFBF7] pb-32 md:pb-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-center gap-2 mb-6">
                <h2 className="font-serif text-2xl font-bold text-stone-900 uppercase tracking-tight">
                  Pizzeria <span className="text-red-700">Salimullah</span>
                </h2>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-stone-600 max-w-sm mx-auto mb-8 leading-relaxed">
                Proudly serving the best wood-fired pizza on Salimullah Road.
                Quality ingredients, time-honored techniques.
              </p>
              <p className="text-stone-400 text-[10px] uppercase tracking-widest">
                © {new Date().getFullYear()} Pizzeria Salimullah. All rights
                reserved.
              </p>
            </div>
          </footer>

          {/* MOBILE BOTTOM NAVIGATION (Thumb-friendly Order Action) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FDFBF7] border-t border-stone-200 p-4 z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-0.5">
                Your Order
              </span>
              <span className="text-lg font-bold text-red-700 underline">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => {
                if (cartItemsCount === 0) {
                  scrollToMenu();
                } else {
                  setIsCartOpen(true);
                }
              }}
              className={`px-6 py-3 rounded-none font-bold shadow-sm flex items-center gap-2 transition-colors uppercase tracking-widest text-[10px] ${cartItemsCount > 0 ? "bg-red-700 hover:bg-red-800 text-white" : "border border-stone-300 hover:border-stone-500 hover:bg-stone-50 text-stone-700"}`}
            >
              {cartItemsCount > 0 ? (
                <>
                  <ShoppingCart size={14} /> View Cart ({cartItemsCount})
                </>
              ) : (
                <>
                  Start Order <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </>
      )}

      {view === "checkout" && (
        <div className="pt-24 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="mb-8">
            <button
              onClick={() => setView("home")}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-sm font-medium uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={16} /> Edit Order
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-8">
              <div>
                <h2 className="font-serif text-3xl font-bold text-stone-900 mb-6">
                  Delivery Details
                </h2>
                <div className="bg-white p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full border-b border-stone-300 py-2 bg-transparent focus:outline-none focus:border-red-700 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full border-b border-stone-300 py-2 bg-transparent focus:outline-none focus:border-red-700 transition-colors"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full border-b border-stone-300 py-2 bg-transparent focus:outline-none focus:border-red-700 transition-colors"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                        Delivery Address
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-0 top-2.5 text-stone-400"
                        />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Salimullah Road..."
                          className="w-full border-b border-stone-300 py-2 pl-8 bg-transparent focus:outline-none focus:border-red-700 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-3xl font-bold text-stone-900 mb-6">
                  Payment
                </h2>
                <div className="bg-white p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: "cod", name: "Cash on Delivery" },
                      { id: "bkash", name: "bKash" },
                      { id: "nagad", name: "Nagad" },
                      { id: "rocket", name: "Rocket" },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-4 border text-[10px] uppercase tracking-widest font-bold transition-all ${paymentMethod === method.id ? "border-red-700 bg-red-50 text-red-700" : "border-stone-200 text-stone-500 hover:border-stone-400"}`}
                      >
                        {method.name}
                      </button>
                    ))}
                  </div>

                  {paymentMethod !== "cod" && (
                    <div className="space-y-6 pt-4 border-t border-stone-100">
                      <p className="text-sm text-stone-600 bg-stone-50 p-4 border border-stone-200">
                        Please send the total amount to our{" "}
                        {paymentMethod === "bkash"
                          ? "bKash"
                          : paymentMethod === "nagad"
                            ? "Nagad"
                            : "Rocket"}{" "}
                        merchant number: <br />
                        <strong className="font-mono text-red-700 text-lg block mt-2">
                          019 0000 0000
                        </strong>
                      </p>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                          Your{" "}
                          {paymentMethod === "bkash"
                            ? "bKash"
                            : paymentMethod === "nagad"
                              ? "Nagad"
                              : "Rocket"}{" "}
                          Number
                        </label>
                        <input
                          type="text"
                          placeholder="01XXX-XXXXXX"
                          className="w-full border-b border-stone-300 py-2 bg-transparent focus:outline-none focus:border-red-700 transition-colors font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-stone-500">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 7X9B3PQ"
                          className="w-full border-b border-stone-300 py-2 bg-transparent focus:outline-none focus:border-red-700 transition-colors font-mono uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-32 bg-stone-900 text-white p-8 shadow-2xl">
                <h3 className="font-serif text-2xl font-bold mb-6">
                  Order Summary
                </h3>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start text-sm"
                    >
                      <div className="flex gap-3">
                        <span className="font-bold text-stone-400">
                          {item.quantity}x
                        </span>
                        <div className="flex flex-col">
                          <span className="font-serif text-stone-200">
                            {item.name}
                          </span>
                          {item.toppings && item.toppings.length > 0 && (
                            <span className="text-[10px] text-stone-400 mt-0.5">
                              + {item.toppings.map((t) => t.name).join(", ")}
                            </span>
                          )}
                          {item.note && (
                            <span className="text-[10px] text-stone-500 italic mt-0.5">
                              "{item.note}"
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-stone-300">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-700 pt-6 space-y-3 mb-6">
                  <div className="flex justify-between text-stone-400 text-xs uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-xs uppercase tracking-widest">
                    <span>Taxes & Fees</span>
                    <span>${(cartTotal * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-300 text-xs uppercase tracking-widest">
                    <span>Delivery</span>
                    <span className="text-red-400">FREE</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-stone-700">
                    <span>Total</span>
                    <span className="text-white">
                      ${(cartTotal * 1.1).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-red-700 hover:bg-red-600 text-white uppercase tracking-[0.2em] py-4 font-bold text-xs transition-colors shadow-lg"
                >
                  Place Order • ${(cartTotal * 1.1).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "success" && (
        <div className="min-h-[80vh] flex items-center justify-center pt-24 pb-12 max-w-lg mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 border border-stone-200 shadow-sm flex flex-col items-center w-full"
          >
            <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mb-2">
              Order Received!
            </h2>
            <p className="font-mono text-stone-900 font-bold mb-6 text-xl">
              {orderId}
            </p>
            <p className="text-sm text-stone-600 leading-relaxed mb-8">
              Your pizza is entering the wood-fired oven. It should arrive at
              your door in approximately <strong>25 minutes</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                onClick={() => setView("home")}
                className="flex-1 bg-white border border-stone-300 hover:bg-stone-50 text-stone-900 uppercase tracking-widest px-8 py-3 text-[10px] font-bold transition-colors"
              >
                Return to Menu
              </button>
              <button
                onClick={() => {
                  setTrackingInputValue(orderId);
                  setTrackedOrderResult({
                    id: orderId,
                    status: "Order Placed",
                    statusIndex: 0,
                    createdAt: new Date(),
                  });
                  setView("track");
                  window.scrollTo(0, 0);
                }}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white uppercase tracking-widest px-8 py-3 text-[10px] font-bold transition-colors"
              >
                Track Order
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {view === "track" && (
        <div className="pt-24 pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-stone-900 mb-6 text-center">
              Track Your Order
            </h2>
            <form
              onSubmit={handleTrackOrder}
              className="flex gap-2 max-w-lg mx-auto"
            >
              <input
                type="text"
                value={trackingInputValue}
                onChange={(e) => setTrackingInputValue(e.target.value)}
                placeholder="Enter Order ID (e.g., PS-123456)"
                className="flex-1 border bg-white border-stone-300 px-4 py-3 bg-transparent text-sm focus:outline-none focus:border-red-700 transition-colors"
                required
              />
              <button
                type="submit"
                className="bg-red-700 hover:bg-red-800 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold transition-colors shadow-lg"
              >
                Track
              </button>
            </form>
          </div>

          <AnimatePresence mode="wait">
            {trackedOrderResult && (
              <motion.div
                key={trackedOrderResult.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-stone-200 shadow-sm p-6 sm:p-12"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-12 pb-8 border-b border-stone-100">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                      Order Number
                    </p>
                    <p className="font-mono text-xl font-bold text-red-700">
                      {trackedOrderResult.id}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                      Expected Delivery
                    </p>
                    <p className="font-serif text-xl font-bold text-stone-900">
                      {trackedOrderResult.createdAt 
                        ? new Date(new Date(trackedOrderResult.createdAt).getTime() + 25 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "~ 25 Mins"}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-6 sm:left-auto sm:top-6 sm:inset-x-0 w-0.5 sm:w-full h-full sm:h-0.5 bg-stone-200 z-0"></div>
                  <div
                    className="absolute left-6 sm:left-auto sm:top-6 sm:inset-x-0 w-0.5 sm:w-full h-full sm:h-0.5 bg-red-700 z-0 transition-all duration-1000 origin-left sm:origin-top"
                    style={{
                      height:
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? `${(trackedOrderResult.statusIndex / 3) * 100}%`
                          : "0.5px",
                      width:
                        typeof window !== "undefined" &&
                        window.innerWidth >= 640
                          ? `${(trackedOrderResult.statusIndex / 3) * 100}%`
                          : "2px",
                    }}
                  ></div>

                  <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-8 sm:gap-4">
                    {[
                      "Order Placed",
                      "Preparing",
                      "Out for Delivery",
                      "Delivered",
                    ].map((status, idx) => {
                      const isActive = idx <= trackedOrderResult.statusIndex;
                      const isCurrent = idx === trackedOrderResult.statusIndex;
                      
                      const stepTimeOffsets = [0, 5, 15, 25];
                      const estTime = trackedOrderResult.createdAt 
                        ? new Date(new Date(trackedOrderResult.createdAt).getTime() + stepTimeOffsets[idx] * 60000)
                        : null;

                      return (
                        <div
                          key={status}
                          className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-3 flex-1 text-left sm:text-center"
                        >
                          <div
                            className={`w-12 h-12 flex items-center shrink-0 justify-center rounded-full border-4 transition-colors duration-500 ${isActive ? "border-red-700 bg-white text-red-700 shadow-md" : "border-stone-200 bg-stone-50 text-stone-300"}`}
                          >
                            {idx === 0 && <ShoppingCart size={20} />}
                            {idx === 1 && <Clock size={20} />}
                            {idx === 2 && <Truck size={20} />}
                            {idx === 3 && <Package size={20} />}
                          </div>
                          <div>
                            <p
                              className={`text-xs uppercase tracking-widest mb-1 ${isCurrent ? "font-bold text-stone-900" : isActive ? "font-bold text-stone-600" : "font-medium text-stone-400"}`}
                            >
                              {status}
                            </p>
                            {estTime && (
                              <p className={`text-[11px] font-mono ${isCurrent ? "text-red-700 font-bold" : isActive ? "text-stone-500" : "text-stone-400"}`}>
                                {estTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {view === "history" && (
        <div className="pt-24 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="mb-12 flex justify-between items-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900">
              Order History
            </h2>
            <button
              onClick={() => setView("home")}
              className="text-stone-500 hover:text-stone-900 text-sm font-medium uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Menu
            </button>
          </div>

          <div className="space-y-6">
            {!user ? (
              <div className="text-center py-12 text-stone-500 border border-stone-200 bg-white">
                Please log in to view your order history.
              </div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-12 text-stone-500 border border-stone-200 bg-white">
                You haven't placed any orders yet.
              </div>
            ) : (
              orderHistory.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row gap-6 justify-between"
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 pb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                          Order Date
                        </p>
                        <p className="text-stone-900 font-medium">
                          {order.createdAt?.toDate
                            ? order.createdAt.toDate().toLocaleDateString()
                            : "Just now"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                          Total
                        </p>
                        <p className="font-mono text-red-700 font-bold">
                          ${order.total}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-1">
                          Status
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase tracking-widest">
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-stone-500 mb-2">
                        Items
                      </p>
                      <ul className="space-y-1">
                        {order.items?.map((item: any) => (
                          <li
                            key={item.id}
                            className="text-sm text-stone-600 flex flex-col gap-1 mb-2"
                          >
                            <div className="flex gap-2">
                              <span className="font-bold text-stone-900 shrink-0">
                                {item.quantity}x
                              </span>
                              <div className="flex flex-col leading-tight">
                                <span>{item.name}</span>
                                {item.toppings && item.toppings.length > 0 && (
                                  <span className="text-[10px] text-stone-500 mt-1">
                                    +{" "}
                                    {item.toppings
                                      .map((t) => t.name)
                                      .join(", ")}
                                  </span>
                                )}
                                {item.note && (
                                  <span className="text-[10px] text-stone-400 italic">
                                    "{item.note}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-stone-100 pt-4 sm:pt-0 sm:pl-6 shrink-0 flex flex-col justify-center sm:items-end">
                    <button
                      onClick={() => {
                        setTrackingInputValue(order.id);
                        setTrackedOrderResult({
                          id: order.id,
                          status: order.status,
                          statusIndex:
                            [
                              "Order Placed",
                              "Preparing",
                              "Out for Delivery",
                              "Delivered",
                            ].indexOf(order.status) || 0,
                          createdAt: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
                        });
                        setView("track");
                        window.scrollTo(0, 0);
                      }}
                      className="bg-stone-900 hover:bg-stone-800 text-white uppercase tracking-widest px-6 py-3 text-[10px] font-bold transition-colors w-full sm:w-auto text-center"
                    >
                      Track Order
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECURE CART DRAWER / SLIDEOVER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60]"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#FDFBF7] border-l border-stone-200 z-[70] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-white">
                <h2 className="font-serif text-2xl font-bold text-stone-900 flex items-center gap-2">
                  <ShoppingCart size={24} className="text-red-700" /> Your Cart
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-stone-700">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70 space-y-4">
                    <ShoppingCart size={64} className="text-stone-300" />
                    <p className="text-lg font-medium text-stone-600">
                      Your cart is feeling a little empty.
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        scrollToMenu();
                      }}
                      className="text-red-700 font-bold uppercase tracking-widest text-[10px] hover:underline mt-2"
                    >
                      Browse the menu
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 bg-white border border-stone-200 shadow-sm rounded-none"
                      >
                        {item.img ? (
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-16 h-16 rounded-none object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-none bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200">
                            <PizzaIcon />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col">
                              <h4 className="font-serif font-bold text-stone-900 leading-tight">
                                {item.name}
                              </h4>
                              {item.toppings && item.toppings.length > 0 && (
                                <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                                  +{" "}
                                  {item.toppings.map((t) => t.name).join(", ")}
                                </p>
                              )}
                              {item.note && (
                                <p className="text-[10px] text-stone-400 italic mt-0.5 leading-tight">
                                  "{item.note}"
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-red-700 shrink-0">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-stone-500 italic">
                              ${item.price} each
                            </span>
                            <div className="flex items-center gap-3 bg-stone-100 rounded-none border border-stone-200 px-2 py-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-xs font-bold text-stone-900 w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="ml-auto text-stone-400 hover:text-red-700 transition-colors p-1"
                              aria-label="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-stone-200 bg-white">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-stone-500 text-sm">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-sm">
                      <span>Taxes & Fees</span>
                      <span>${(cartTotal * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold pt-3 border-t border-stone-200 text-stone-900">
                      <span>Total</span>
                      <span className="text-red-700">
                        ${(cartTotal * 1.1).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        if (!user) {
                          setShowLoginModal(true);
                        } else {
                          setView("checkout");
                          window.scrollTo(0, 0);
                        }
                      }}
                      className="w-full bg-red-700 hover:bg-red-800 text-white uppercase tracking-[0.2em] py-4 rounded-none font-bold text-[10px] transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                    >
                      {user ? "Secure Checkout" : "Login to Checkout"}
                    </button>
                    <p className="text-[10px] uppercase tracking-widest text-center text-stone-500 flex items-center justify-center gap-1 font-medium mt-4">
                      <Info size={12} /> Delivery time to Salimullah Road: ~25
                      mins
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper icon
function PizzaIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 11-1 9" />
      <path d="m19 11-4-7" />
      <path d="M2 11h20" />
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 1.9 1.6h10a2 2 0 0 0 1.9-1.6l1.6-7.4" />
      <path d="m9 11 1 9" />
    </svg>
  );
}
