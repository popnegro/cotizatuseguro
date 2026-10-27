import LandingPage from "./landing-page";

type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  void params;

  const validProducts = ["auto", "moto", "hogar", "consorcio", "bicicletas", "caucion_alquiler"];
  const rawProduct = typeof searchParams?.producto === "string" ? searchParams.producto : undefined;
  const initialProduct = rawProduct && validProducts.includes(rawProduct) ? rawProduct : undefined;

  return <LandingPage initialProduct={initialProduct} searchParams={searchParams} />;
}