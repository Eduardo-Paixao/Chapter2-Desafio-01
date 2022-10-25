import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = cart.find((product) => product.id === productId);

      const { data: stock } = await api.get(`stock/${productId}`);

      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const { data } = await api.get(`products/${productId}`);
        const newProduct = {
          ...data,
          amount: 1,
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.findIndex((product) => product.id === productId) >= 0) {
        setCart(cart.filter((product) => product.id !== productId));
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(cart.filter((product) => product.id !== productId))
        );
      } else {
        throw Error();
      }
    } catch (error) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }
    try {
      const { data } = await api.get(`stock/${productId}`);
      if (data.amount >= amount) {
        if (cart.findIndex((product) => product.id === productId) >= 0) {
          setCart(
            cart.map((item) =>
              item.id === productId ? { ...item, amount: amount } : item
            )
          );
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(
              cart.map((item) =>
                item.id === productId ? { ...item, amount: amount } : item
              )
            )
          );
        } else {
          throw Error();
        }
      } else {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
    } catch (error) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
