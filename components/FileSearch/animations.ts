export const dropdownAnimation = {
  initial: { height: 0, opacity: 0 },
  animate: (height: string) => ({
    height,
    opacity: 1,
    transition: { 
      height: { duration: 0.2, ease: "easeInOut" }, 
      opacity: { duration: 0.2 } 
    }
  }),
  exit: {
    height: 0,
    opacity: 0,
    transition: { 
      height: { duration: 0.2, ease: "easeInOut" }, 
      opacity: { duration: 0.1 } 
    }
  }
}