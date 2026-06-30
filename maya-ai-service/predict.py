import argparse

from comparison import load_model, compare_images


def main():

    parser = argparse.ArgumentParser(
        description="Compare two images using the Siamese Network."
    )

    parser.add_argument(
        "--img1",
        required=True,
        help="Path to first image"
    )

    parser.add_argument(
        "--img2",
        required=True,
        help="Path to second image"
    )

    parser.add_argument(
        "--model",
        default="saved_models/siamese_model.pth",
        help="Path to trained model"
    )

    args = parser.parse_args()

    model = load_model(args.model)

    score = compare_images(
        args.img1,
        args.img2,
        model
    )

    print(f"\nImage 1 : {args.img1}")
    print(f"Image 2 : {args.img2}")
    print(f"Similarity : {score:.2f}%")


if __name__ == "__main__":
    main()