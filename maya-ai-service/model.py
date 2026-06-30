import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models


class Encoder(nn.Module):
    """
    ResNet18 encoder that generates a 128-dimensional embedding
    for image similarity comparison.
    """

    def __init__(self):
        super().__init__()

        # Load pretrained ResNet18 backbone
        backbone = models.resnet18(
            weights=models.ResNet18_Weights.DEFAULT
        )

        # Freeze all backbone layers
        for param in backbone.parameters():
            param.requires_grad = False

        # Fine-tune only the last residual block
        for param in backbone.layer4.parameters():
            param.requires_grad = True

        # Remove the final classification layer
        self.feature_extractor = nn.Sequential(
            *list(backbone.children())[:-1]
        )

        # Projection head
        self.projection = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 128)
        )

    def forward(self, x):

        # Extract ResNet features
        x = self.feature_extractor(x)

        # Flatten feature vector
        x = x.view(x.size(0), -1)

        # Generate embedding
        x = self.projection(x)

        # Normalize embedding
        x = F.normalize(x, p=2, dim=1)

        return x


class SiameseNetwork(nn.Module):
    """
    Siamese Network using a shared ResNet18 encoder.
    """

    def __init__(self):
        super().__init__()
        self.encoder = Encoder()

    def forward(self, img1, img2):

        embedding1 = self.encoder(img1)
        embedding2 = self.encoder(img2)

        return embedding1, embedding2